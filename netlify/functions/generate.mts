import type { Context } from '@netlify/functions';
import OpenAI from 'openai';
import { getStore } from '@netlify/blobs';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { aiJobs, articles, categories, media } from '../../db/schema.js';
import { generationSchema } from '../lib/validation.js';
import { editorialPrompt, validateGeneration } from '../lib/ai.js';
import { body, handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';

export default handleErrors(async (request: Request, context: Context) => {
  const user = await requireAdmin(request, context);
  if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  if (!process.env.OPENAI_API_KEY) throw new HttpError(503, 'IA não configurada: habilite o AI Gateway da Netlify ou configure OPENAI_API_KEY somente nas Functions.');
  const input = await body(request, generationSchema, 160000);
  const [records, categoryRecords] = await Promise.all([
    db.select().from(articles).where(and(eq(articles.status, 'publicado'), isNull(articles.deletedAt))),
    db.select().from(categories),
  ]);
  if (!categoryRecords.some(category => category.slug === input.categorySlug)) throw new HttpError(422, 'Selecione uma categoria existente.');
  const catalog = records.map(record => record.document);
  const categoryList = categoryRecords.map(record => record.document);
  const hash = createHash('sha256').update(JSON.stringify({ user: user.id, input, catalog: records.map(record => [record.id, record.version]), categories: categoryList })).digest('hex');
  const cached = await db.transaction(async transaction => {
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
    const previous = (await transaction.select().from(aiJobs).where(eq(aiJobs.id, hash)))[0];
    if (previous?.status === 'complete') return previous.result;
    if (previous && Date.now() - previous.createdAt.getTime() < 60000) throw new HttpError(429, 'Esta solicitação já está em andamento ou acabou de falhar. Aguarde um minuto.');
    const sinceHour = new Date(Date.now() - 3600000);
    const [usage] = await transaction.select({ count: sql<number>`count(*)::int` }).from(aiJobs).where(and(eq(aiJobs.ownerId, user.id), sql`${aiJobs.createdAt} > ${sinceHour}`));
    const sinceMinute = new Date(Date.now() - 60000);
    const [recent] = await transaction.select({ count: sql<number>`count(*)::int` }).from(aiJobs).where(and(eq(aiJobs.ownerId, user.id), sql`${aiJobs.createdAt} > ${sinceMinute}`));
    if (usage.count >= 10 || recent.count > 0) throw new HttpError(429, 'Limite de uma geração por minuto e dez por hora.');
    await transaction.insert(aiJobs).values({ id: hash, ownerId: user.id, status: 'pending' }).onConflictDoUpdate({ target: aiJobs.id, set: { status: 'pending', createdAt: new Date(), result: null } });
    return null;
  });
  if (cached) return json({ result: cached, cached: true });
  try {
    const images: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    if (input.images.length) {
      const store = getStore({ name: 'simples-oculto-images', consistency: 'strong' });
      for (const image of input.images) {
        const record = (await db.select().from(media).where(eq(media.key, image.key)))[0];
        if (!record) throw new HttpError(422, 'Imagem não encontrada.');
        const stored = await store.get(image.key, { type: 'arrayBuffer' });
        if (!stored) throw new HttpError(422, 'Imagem não encontrada no Blobs.');
        const thumbnail = await sharp(Buffer.from(stored)).resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
        images.push({ type: 'text', text: `Imagem com key ${image.key}; nome do arquivo (não confiável): ${image.name}` }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${thumbnail.toString('base64')}`, detail: 'low' } });
      }
    }
    const provider = new OpenAI({ timeout: 50000, maxRetries: 0 });
    const completion = await provider.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 14000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: editorialPrompt },
        { role: 'user', content: [{ type: 'text', text: JSON.stringify({ input, categories: categoryList.map(category => ({ slug: category.slug, name: category.name })), articles: catalog.slice(0, 120).map(article => ({ title: article.title, slug: article.slug, excerpt: article.excerpt, categorySlug: article.categorySlug })) }) }, ...images] },
      ],
    });
    if (completion.choices[0]?.finish_reason !== 'stop') throw new HttpError(422, 'A resposta foi interrompida. Reduza o tamanho do artigo.');
    const result = validateGeneration(JSON.parse(completion.choices[0].message.content ?? ''), input, catalog, categoryList);
    await db.update(aiJobs).set({ status: 'complete', result }).where(eq(aiJobs.id, hash));
    return json({ result, cached: false });
  } catch (error) {
    await db.update(aiJobs).set({ status: 'failed' }).where(eq(aiJobs.id, hash));
    if (error instanceof HttpError) throw error;
    if (error instanceof OpenAI.APIError && error.status === 429) throw new HttpError(429, 'Limite do provedor de IA ou créditos atingido. Tente mais tarde.');
    throw new HttpError(502, 'A IA não retornou um resultado válido. O original permanece intacto. Verifique o Gateway e revise o artigo manualmente.');
  }
});

export const config = { path: '/api/generate' };
