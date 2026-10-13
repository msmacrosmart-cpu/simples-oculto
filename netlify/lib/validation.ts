import { z } from 'zod';

export const slugSchema = z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const shortText = z.string().max(500);
const mediumText = z.string().max(2000);
const bodyText = z.string().max(60000);
export const mediaKeySchema = z.string().uuid();

export function safeUrl(value: string): boolean {
  if (!value || /^images\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return true;
  if (/^\/api\/media\/[0-9a-f-]{36}$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const imageUrlSchema = z.string().max(2048).refine(safeUrl, 'URL de imagem inválida. Use HTTPS, images/ ou mídia persistente.');
const internalLinkSchema = z.object({
  title: shortText,
  slug: slugSchema,
  reason: mediumText.default(''),
});

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: bodyText, level: z.union([z.literal(2), z.literal(3)]), id: shortText.default('') }),
  z.object({ type: z.literal('paragraph'), text: bodyText }),
  z.object({ type: z.literal('list'), items: z.array(bodyText).max(150), ordered: z.boolean().default(false) }),
  z.object({ type: z.literal('quote'), text: bodyText, cite: mediumText.default('') }),
  z.object({ type: z.literal('image'), src: imageUrlSchema, alt: mediumText, caption: mediumText.default(''), mediaKey: mediaKeySchema.optional() }),
]);

export const seoSchema = z.object({
  title: z.string().max(250).default(''),
  description: z.string().max(500).default(''),
  keyword: shortText.default(''),
  secondaryKeywords: z.array(shortText).max(30).default([]),
  canonical: z.string().max(2048).refine(value => !value || value.startsWith('/artigo/') || safeUrl(value), 'Canonical inválido.').default(''),
  socialTitle: z.string().max(250).default(''),
  socialDescription: z.string().max(500).default(''),
  internalLinks: z.array(internalLinkSchema).max(8).default([]),
});

export const articleSchema = z.object({
  id: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  subtitle: mediumText.default(''),
  excerpt: z.string().trim().min(1).max(2000),
  categorySlug: slugSchema,
  tags: z.array(shortText).max(30).default([]),
  authorId: z.string().max(200).default('equipe-so'),
  coverImage: imageUrlSchema,
  coverImageAlt: mediumText.default(''),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T[0-9:.Z+-]+)?$/),
  status: z.enum(['rascunho', 'publicado', 'agendado']),
  baseViews: z.number().nonnegative().default(0),
  featured: z.boolean().default(false),
  content: z.array(blockSchema).min(1).max(400),
  sources: z.array(mediumText).max(100).default([]),
  seo: seoSchema,
  editorialWarnings: z.array(mediumText).max(40).default([]),
}).refine(article => article.content.some(block => block.type === 'image' || block.type === 'list' ? block.type === 'image' || block.items.some(item => item.trim()) : block.text.trim()), 'O artigo precisa ter conteúdo.');

export const categorySchema = z.object({
  slug: slugSchema,
  name: shortText.min(1),
  shortName: shortText.min(1),
  description: mediumText,
  accent: z.string().regex(/^from-(violet|amber|fuchsia|emerald)-500 to-(indigo|orange|pink|teal)-500$/),
  icon: z.string().max(30),
});

export const settingsSchema = z.object({
  siteName: shortText,
  siteDescription: mediumText,
  logoText: shortText,
  defaultShareImage: imageUrlSchema,
  socialTwitter: imageUrlSchema,
  socialInstagram: imageUrlSchema,
  socialYoutube: imageUrlSchema,
  contactEmail: z.union([z.literal(''), z.email()]),
});

export const generationSchema = z.object({
  mode: z.enum(['fiel', 'editorial']),
  title: z.string().trim().min(1).max(300),
  text: z.string().trim().min(30).max(35000),
  instructions: z.string().max(2000).default(''),
  categorySlug: slugSchema,
  tags: z.array(shortText).max(30).default([]),
  images: z.array(z.object({ key: mediaKeySchema, name: shortText, alt: mediumText.default('') })).max(12).default([]),
});

export type Article = z.infer<typeof articleSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SiteSettings = z.infer<typeof settingsSchema>;

export function imageKeys(article: Article): string[] {
  const urls = [article.coverImage, ...article.content.filter(block => block.type === 'image').map(block => block.src)];
  return [...new Set(urls.filter(url => url.startsWith('/api/media/')).map(url => url.slice('/api/media/'.length)))];
}

export function isAdministrator(user: { roles?: string[]; appMetadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const authorization = user.appMetadata?.authorization as { roles?: string[] } | undefined;
  return [...(user.roles ?? []), ...(authorization?.roles ?? [])].includes('admin');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function sourceText(blocks: Block[]): string {
  return blocks.flatMap(block => block.type === 'image' ? [] : block.type === 'list' ? block.items : [block.text, ...(block.type === 'quote' && block.cite ? [block.cite] : [])]).join('\n');
}

export function faithfulText(value: string): string {
  return value.normalize('NFC').replace(/^\s*(?:#{1,6}\s+|[-*•>]\s+|\d+[.)]\s+)/gm, '').replace(/\s+/g, ' ').trim();
}
