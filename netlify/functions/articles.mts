import type { Context } from '@netlify/functions';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { articles } from '../../db/schema.js';
import { saveArticle } from '../lib/articles.js';
import { articleSchema } from '../lib/validation.js';
import { body, handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';

export default handleErrors(async (request: Request, context: Context) => {
  await requireAdmin(request, context);
  if (request.method === 'POST') {
    const input = await body(request, z.object({ article: articleSchema, version: z.number().int().positive().optional(), confirmPublish: z.boolean().default(false), confirmSchedule: z.boolean().default(false) }));
    if (input.article.status === 'publicado' && !input.confirmPublish) throw new HttpError(422, 'Confirme explicitamente a publicação.');
    if (input.article.status === 'agendado' && !input.confirmSchedule) throw new HttpError(422, 'Confirme explicitamente o agendamento.');
    return json({ article: await saveArticle(input.article, input.version) });
  }
  if (request.method === 'DELETE') {
    const input = await body(request, z.object({ id: z.string().min(1).max(200), version: z.number().int().positive() }));
    const updated = await db.update(articles).set({ status: 'excluido', deletedAt: new Date(), updatedAt: new Date(), version: input.version + 1 }).where(and(eq(articles.id, input.id), eq(articles.version, input.version))).returning({ id: articles.id });
    if (!updated.length) throw new HttpError(409, 'Artigo não encontrado ou modificado em outra sessão.');
    return json({ ok: true });
  }
  throw new HttpError(405, 'Método não permitido.');
});

export const config = { path: '/api/articles' };
