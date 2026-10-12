#!/usr/bin/env node
/**
 * Gera o `sitemap.xml` do Simples Oculto.
 *
 * Fontes de dados, nesta ordem de prioridade:
 *   1. `data/articles.json`  — exportado pelo painel (menu "SEO e Sitemap" →
 *      "Exportar artigos (JSON)"). Contém também os artigos criados/editados
 *      no painel, que vivem no localStorage do navegador.
 *   2. `index.html`          — artigos e categorias embutidos na SPA.
 *
 * Uso:
 *   node scripts/generate-sitemap.mjs
 *   SITE_URL=https://outro-dominio.com node scripts/generate-sitemap.mjs
 *
 * O script NÃO promete indexação: ele apenas produz um sitemap válido.
 * O envio e a indexação são feitos pelo Google Search Console.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = (process.env.SITE_URL || 'https://simples-oculto.blog.vercel.app').replace(/\/+$/, '');

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/artigos', changefreq: 'daily', priority: '0.9' },
  { path: '/sobre', changefreq: 'monthly', priority: '0.5' },
  { path: '/contato', changefreq: 'monthly', priority: '0.4' },
  { path: '/politica-de-privacidade', changefreq: 'yearly', priority: '0.2' },
  { path: '/termos-de-uso', changefreq: 'yearly', priority: '0.2' },
];

/* ------------------------------------------------------------------ utils */

/** Encontra o índice depois do fecha-colchete/chave que casa com o abridor. */
function findEnd(src, start) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('Não foi possível encontrar o fim do literal em ' + start);
}

function readArrayLiteral(html, declaration) {
  const at = html.indexOf(declaration);
  if (at === -1) throw new Error('Não encontrei "' + declaration + '" em index.html');
  const open = html.indexOf('[', at);
  const end = findEnd(html, open);
  return html.slice(open, end);
}

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const abs = (u) => (/^https?:\/\//.test(u) ? u : SITE_URL + (String(u).startsWith('/') ? '' : '/') + u);

function isoDay(value) {
  const d = new Date(`${String(value ?? '').slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/* ------------------------------------------------- leitura do index.html */

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

const seedArticles = new Function(
  'L',
  'k',
  'Rt',
  `return ${readArrayLiteral(html, 'const Do=[')};`
)(
  (text) => ({ type: 'paragraph', text }),
  (level, text) => ({ type: 'heading', level, text }),
  (items) => ({ type: 'list', items })
);

const seedCategories = new Function(`return ${readArrayLiteral(html, 'const Yt=[')};`)();

/* ------------------------------------- merge com o export do painel (JSON) */

let categories = seedCategories;
let articles = seedArticles;
const dataFile = join(ROOT, 'data', 'articles.json');

if (existsSync(dataFile)) {
  const exported = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (Array.isArray(exported?.categories) && exported.categories.length) categories = exported.categories;
  if (Array.isArray(exported?.articles) && exported.articles.length) {
    const deleted = new Set(Array.isArray(exported.deleted) ? exported.deleted : []);
    const byId = new Map(seedArticles.map((a) => [a.id, a]));
    for (const a of exported.articles) if (a?.id) byId.set(a.id, a);
    for (const id of deleted) byId.delete(id);
    articles = [...byId.values()];
    console.log(`• ${exported.articles.length} artigo(s) vindos de data/articles.json`);
  }
}

const published = articles
  .filter((a) => a.status === 'publicado' && a.slug)
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

const newest = published.length
  ? published.map((a) => isoDay(a.publishedAt)).sort().at(-1)
  : isoDay(new Date().toISOString());

/* ------------------------------------------------------------- montagem */

const urls = [];

for (const r of STATIC_ROUTES) {
  urls.push({ loc: SITE_URL + (r.path === '/' ? '/' : r.path), lastmod: newest, changefreq: r.changefreq, priority: r.priority, image: null });
}
for (const c of categories) {
  urls.push({ loc: `${SITE_URL}/categoria/${c.slug}`, lastmod: newest, changefreq: 'weekly', priority: '0.7', image: null });
}
for (const a of published) {
  urls.push({
    loc: `${SITE_URL}/artigo/${a.slug}`,
    lastmod: isoDay(a.publishedAt),
    changefreq: 'monthly',
    priority: '0.8',
    image: a.coverImage ? abs(a.coverImage) : null,
  });
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
for (const u of urls) {
  xml += '  <url>\n';
  xml += `    <loc>${esc(u.loc)}</loc>\n`;
  xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
  xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
  xml += `    <priority>${u.priority}</priority>\n`;
  if (u.image) {
    xml += '    <image:image>\n';
    xml += `      <image:loc>${esc(u.image)}</image:loc>\n`;
    xml += '    </image:image>\n';
  }
  xml += '  </url>\n';
}
xml += '</urlset>\n';

writeFileSync(join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`✔ sitemap.xml escrito com ${urls.length} URLs (${published.length} artigos publicados).`);

/* ------------------------------------------------------ checagem robots */

const robotsPath = join(ROOT, 'robots.txt');
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!new RegExp(`^\\s*Sitemap:\\s*${SITE_URL}/sitemap\\.xml`, 'im').test(robots)) {
    console.warn(`⚠ robots.txt não aponta para ${SITE_URL}/sitemap.xml`);
    process.exitCode = 1;
  }
} else {
  console.warn('⚠ robots.txt não encontrado.');
  process.exitCode = 1;
}
