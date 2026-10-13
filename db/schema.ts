import { pgTable, text, jsonb, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import type { Article, Category, SiteSettings } from '../netlify/lib/validation.js';

export const categories = pgTable('editorial_categories', {
  slug: text('slug').primaryKey(),
  document: jsonb('document').$type<Category>().notNull(),
});

export const articles = pgTable('editorial_articles', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  categorySlug: text('category_slug').notNull().references(() => categories.slug),
  status: text('status').notNull(),
  document: jsonb('document').$type<Article>().notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [index('editorial_articles_status_category_idx').on(table.status, table.categorySlug)]);

export const settings = pgTable('editorial_settings', {
  id: text('id').primaryKey(),
  document: jsonb('document').$type<SiteSettings>().notNull(),
});

export const media = pgTable('editorial_media', {
  key: text('key').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const articleMedia = pgTable('editorial_article_media', {
  articleId: text('article_id').notNull().references(() => articles.id),
  mediaKey: text('media_key').notNull().references(() => media.key),
}, (table) => [primaryKey({ columns: [table.articleId, table.mediaKey] })]);

export const aiJobs = pgTable('editorial_ai_jobs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  status: text('status').notNull(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('editorial_ai_jobs_owner_time_idx').on(table.ownerId, table.createdAt)]);
