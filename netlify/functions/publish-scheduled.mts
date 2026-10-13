import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { articles } from '../../db/schema.js';

export default async () => {
  const today = new Date().toISOString().slice(0, 10);
  await db.update(articles).set({
    status: 'publicado',
    document: sql`jsonb_set(${articles.document}, '{status}', '"publicado"'::jsonb)`,
    updatedAt: new Date(),
    version: sql`${articles.version} + 1`,
  }).where(and(eq(articles.status, 'agendado'), isNull(articles.deletedAt), sql`${articles.document}->>'publishedAt' <= ${today}`));
  return new Response(null, { status: 204 });
};

export const config = { schedule: '0 * * * *' };
