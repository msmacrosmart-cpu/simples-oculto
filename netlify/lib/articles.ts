import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { articles, articleMedia, categories, media } from '../../db/schema.js';
import { imageKeys, type Article } from './validation.js';
import { HttpError } from './http.js';

export async function saveArticle(article: Article, version?: number): Promise<Article & { version: number }> {
  return db.transaction(async transaction => {
    const existing = (await transaction.select().from(articles).where(eq(articles.id, article.id)).for('update'))[0];
    if (existing && (version === undefined || existing.version !== version)) throw new HttpError(409, 'O artigo mudou em outra sessão. Recarregue antes de salvar.');
    if (existing && existing.deletedAt) throw new HttpError(409, 'Este artigo foi excluído.');
    if (!(await transaction.select().from(categories).where(eq(categories.slug, article.categorySlug))).length) throw new HttpError(422, 'Categoria inexistente.');
    const duplicate = (await transaction.select().from(articles).where(eq(articles.slug, article.slug)))[0];
    if (duplicate && duplicate.id !== article.id) throw new HttpError(409, 'Slug já utilizado por outro artigo.');
    if (existing?.status === 'publicado' && article.slug !== existing.slug) throw new HttpError(422, 'O slug de um artigo publicado é preservado para não quebrar URLs.');
    const keys = imageKeys(article);
    for (const key of keys) if (!(await transaction.select().from(media).where(eq(media.key, key))).length) throw new HttpError(422, 'Imagem não encontrada no armazenamento persistente.');
    for (const link of article.seo.internalLinks) {
      if (!(await transaction.select().from(articles).where(and(eq(articles.slug, link.slug), eq(articles.status, 'publicado'), isNull(articles.deletedAt)))).length) throw new HttpError(422, 'Um link interno não corresponde a um artigo publicado.');
    }
    const nextVersion = (existing?.version ?? 0) + 1;
    const record = { id: article.id, slug: article.slug, title: article.title, categorySlug: article.categorySlug, status: article.status, document: article, version: nextVersion, updatedAt: new Date() };
    await transaction.insert(articles).values(record).onConflictDoUpdate({ target: articles.id, set: record });
    await transaction.delete(articleMedia).where(eq(articleMedia.articleId, article.id));
    if (keys.length) await transaction.insert(articleMedia).values(keys.map(key => ({ articleId: article.id, mediaKey: key })));
    return { ...article, version: nextVersion };
  });
}
