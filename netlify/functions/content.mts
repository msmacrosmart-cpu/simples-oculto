import type { Context } from '@netlify/functions';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { articles, categories, settings } from '../../db/schema.js';
import { handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';

export default handleErrors(async (request: Request, context: Context) => {
  if (request.method !== 'GET') throw new HttpError(405, 'Método não permitido.');
  const administrative = new URL(request.url).searchParams.get('admin') === '1';
  if (administrative) await requireAdmin(request, context);
  const [records, categoryRecords, settingRecords] = await Promise.all([
    db.select().from(articles).where(administrative ? isNull(articles.deletedAt) : and(eq(articles.status, 'publicado'), isNull(articles.deletedAt))),
    db.select().from(categories),
    db.select().from(settings).where(eq(settings.id, 'site')),
  ]);
  const removed = await db.select({ id: articles.id }).from(articles).where(eq(articles.status, 'excluido'));
  return json({ articles: records.map(record => ({ ...record.document, version: record.version })), categories: categoryRecords.map(record => record.document), settings: settingRecords[0]?.document ?? null, removedIds: removed.map(record => record.id) });
});

export const config = { path: '/api/content' };
