import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import sharp from 'sharp';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { articles, articleMedia, media } from '../../db/schema.js';
import { mediaKeySchema } from '../lib/validation.js';
import { handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';

export default handleErrors(async (request: Request, context: Context) => {
  const store = getStore({ name: 'simples-oculto-images', consistency: 'strong' });
  if (request.method === 'POST') {
    const user = await requireAdmin(request, context);
    const limit = 4 * 1024 * 1024;
    if (Number(request.headers.get('content-length')) > limit + 16000) throw new HttpError(413, 'Máximo de 4 MB por imagem.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new HttpError(415, 'Envie JPEG, PNG ou WebP. SVG e arquivos animados não são aceitos.');
    if (!file.size || file.size > limit) throw new HttpError(413, 'Máximo de 4 MB por imagem.');
    const today = new Date(Date.now() - 86400000);
    const [usage] = await db.select({ count: sql<number>`count(*)::int` }).from(media).where(and(eq(media.ownerId, user.id), sql`${media.createdAt} > ${today}`));
    if (usage.count >= 100) throw new HttpError(429, 'Limite de 100 imagens por administrador em 24 horas.');
    const input = Buffer.from(await file.arrayBuffer());
    let normalized: Buffer;
    let width: number;
    let height: number;
    try {
      const decoder = sharp(input, { limitInputPixels: 24000000, failOn: 'warning' });
      const metadata = await decoder.metadata();
      const declared = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (metadata.format !== declared || (metadata.pages ?? 1) !== 1) throw new Error('Formato inválido');
      const output = await decoder.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
      normalized = output.data; width = output.info.width; height = output.info.height;
    } catch { throw new HttpError(422, 'Imagem inválida, corrompida, animada ou maior que 24 megapixels.'); }
    const key = crypto.randomUUID();
    await store.set(key, new Uint8Array(normalized).buffer);
    try { await db.insert(media).values({ key, ownerId: user.id, name: file.name.slice(0, 200), contentType: 'image/webp', size: normalized.length, width, height }); }
    catch (error) { await store.delete(key); throw error; }
    return json({ key, url: `/api/media/${key}`, name: file.name.slice(0, 200), width, height });
  }
  if (request.method === 'GET') {
    const key = mediaKeySchema.safeParse(context.params.key);
    if (!key.success) throw new HttpError(404, 'Imagem não encontrada.');
    const record = (await db.select().from(media).where(eq(media.key, key.data)))[0];
    if (!record) throw new HttpError(404, 'Imagem não encontrada.');
    const published = await db.select({ id: articles.id }).from(articleMedia).innerJoin(articles, eq(articles.id, articleMedia.articleId)).where(and(eq(articleMedia.mediaKey, key.data), eq(articles.status, 'publicado'), isNull(articles.deletedAt))).limit(1);
    if (!published.length) await requireAdmin(request, context);
    const image = await store.get(key.data, { type: 'arrayBuffer' });
    if (!image) throw new HttpError(404, 'Imagem não encontrada.');
    return new Response(image, { headers: { 'Content-Type': record.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  throw new HttpError(405, 'Método não permitido.');
});

export const config = { path: ['/api/media', '/api/media/:key'] };
