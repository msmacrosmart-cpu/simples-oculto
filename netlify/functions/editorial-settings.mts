import type { Context } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { categories, settings, articles } from '../../db/schema.js';
import { categorySchema, settingsSchema, slugSchema } from '../lib/validation.js';
import { body, handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';

export default handleErrors(async (request: Request, context: Context) => {
  await requireAdmin(request, context);
  if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const input = await body(request, z.discriminatedUnion('action', [
    z.object({ action: z.literal('category'), category: categorySchema }),
    z.object({ action: z.literal('delete-category'), slug: slugSchema }),
    z.object({ action: z.literal('settings'), settings: settingsSchema }),
  ]));
  if (input.action === 'category') await db.insert(categories).values({ slug: input.category.slug, document: input.category }).onConflictDoUpdate({ target: categories.slug, set: { document: input.category } });
  if (input.action === 'delete-category') {
    if ((await db.select({ id: articles.id }).from(articles).where(eq(articles.categorySlug, input.slug))).length) throw new HttpError(409, 'Não é possível excluir uma categoria com artigos.');
    await db.delete(categories).where(eq(categories.slug, input.slug));
  }
  if (input.action === 'settings') await db.insert(settings).values({ id: 'site', document: input.settings }).onConflictDoUpdate({ target: settings.id, set: { document: input.settings } });
  return json({ ok: true });
});

export const config = { path: '/api/editorial-settings' };
