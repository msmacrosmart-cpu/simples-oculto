import { JSDOM } from 'jsdom';
import { buildDom, goto, setInput } from './load-page.mjs';

const { dom, logs, window: w, doc } = await buildDom({ JSDOM });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await wait(1200);

function txt() { return (doc.getElementById('root').textContent || '').replace(/\s+/g, ' '); }
const results = [];
const ok = (name, cond, extra = '') => results.push([cond ? 'PASS' : 'FALHA', name, extra]);

/* ---------------------------------------------------------------- rotas */

// 1) home
ok('home renderiza', /Descubra o que se esconde/.test(txt()));
ok('home: canonical = /', doc.querySelector('link[rel=canonical]').getAttribute('href') === 'https://simples-oculto.blog.vercel.app/');
ok('home: JSON-LD WebSite', /"@type":"WebSite"/.test(doc.getElementById('json-ld-dynamic')?.textContent || ''));
const imgs = [...doc.querySelectorAll('img')];
ok('home: imagens com alt', imgs.every((i) => i.hasAttribute('alt')), `${imgs.filter(i=>!i.hasAttribute('alt')).length} sem alt`);
ok('home: srcset nas capas Pexels', imgs.some((i) => (i.getAttribute('srcset') || '').includes('480w')));
const cover = imgs.find((i) => (i.getAttribute('src') || '').includes('/images/articles/'));
ok('capa local tem srcset WebP', !!cover && /-480\.webp 480w/.test(cover.getAttribute('srcset') || ''), cover?.getAttribute('srcset') || 'sem srcset');
// sem CLS: ou width/height explícitos, ou o CSS já fixa a altura (h-*/h-full/aspect-*)
const noDim = imgs.filter((i) => {
  if (i.hasAttribute('width') && i.hasAttribute('height')) return false;
  return !/\b(h-full|aspect-|(^|\s)h-\d)/.test(i.className || '');
});
ok('nenhuma imagem sem altura reservada', noDim.length === 0, noDim.map((i) => i.getAttribute('src')).slice(0, 3).join(' '));
const eager = imgs.filter((i) => i.getAttribute('loading') !== 'lazy');
ok('no máx. 3 imagens eager na home', eager.length <= 3, eager.map((i) => (i.getAttribute('src') || '').slice(0, 50)).join(' '));
ok('home: nenhum link com #/', ![...doc.querySelectorAll('a')].some((a) => (a.getAttribute('href') || '').startsWith('#/')));
ok('home: grid de categorias responsivo', /so-cols-narrow grid grid-cols-2/.test(doc.querySelector('#root').innerHTML));

/* ------------------------------------------------------- ativos e marca */
const head = doc.head.innerHTML;
ok('favicon 16/32/64 absolutos', ['/images/favicon-16.png', '/images/favicon-32.png', '/images/favicon-64.png'].every((f) => head.includes(`href="${f}"`)));
ok('apple-touch-icon absoluto', head.includes('href="/images/apple-touch-icon.png"'));
ok('sem referência a images/logo.svg', !head.includes('logo.svg'));
ok('manifest absoluto', head.includes('href="/site.webmanifest"'));
const logoEl = doc.querySelector('a[href="/"] img');
ok('logo do cabeçalho é imagem', !!logoEl);
ok('logo com src absoluto', logoEl?.getAttribute('src') === '/images/logo.png');
ok('logo com width/height (evita CLS)', logoEl?.hasAttribute('width') && logoEl?.hasAttribute('height'));
ok('logo com object-contain (sem corte)', /object-contain/.test(logoEl?.className || ''));
const rel = doc.body.innerHTML.match(/"images\/[^"]+"/g);
ok('nenhum caminho de imagem relativo', !rel, (rel || []).slice(0, 3).join(' '));

// 2) artigos
await goto(w, '/artigos');
ok('/artigos renderiza', /Todos os artigos/.test(txt()));
ok('/artigos canonical', doc.querySelector('link[rel=canonical]').getAttribute('href').endsWith('/artigos'));

// 3) categoria
await goto(w, '/categoria/esoterismo');
ok('/categoria renderiza', /Esoterismo e Espiritualidade/.test(txt()));
ok('/categoria canonical', doc.querySelector('link[rel=canonical]').getAttribute('href').endsWith('/categoria/esoterismo'));

// 4) artigo
await goto(w, '/artigo/numerologia-origem-significado-numeros');
const t4 = txt();
ok('/artigo renderiza', /Numerologia/.test(t4), t4.slice(0, 80));
ok('/artigo canonical', doc.querySelector('link[rel=canonical]').getAttribute('href') === 'https://simples-oculto.blog.vercel.app/artigo/numerologia-origem-significado-numeros');
const jl = doc.getElementById('json-ld-dynamic')?.textContent || '';
ok('/artigo JSON-LD BlogPosting + Breadcrumb', jl.includes('BlogPosting') && jl.includes('BreadcrumbList'));
ok('/artigo JSON-LD sem domínio antigo', !jl.includes('simplesoculto.com.br'));
ok('/artigo og:image absoluto', /^https:\/\//.test(doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''));
ok('/artigo tem artigos relacionados', /Artigos relacionados/.test(t4));
ok('/artigo sumário presente', !!doc.querySelector('nav[aria-label="Sumário do artigo"]'));

// 5) pesquisa (noindex)
await goto(w, '/pesquisa?q=numerologia');
ok('/pesquisa renderiza resultados', /resultado/.test(txt()));
ok('/pesquisa é noindex', (doc.querySelector('meta[name=robots]')?.getAttribute('content') || '').includes('noindex'));

// 6) páginas estáticas
for (const [p, rx] of [['/sobre', /Sobre o Simples Oculto/], ['/contato', /Fale com a gente/],
                       ['/politica-de-privacidade', /Política de Privacidade/], ['/termos-de-uso', /Termos de Uso/]]) {
  await goto(w, p);
  ok(`${p} renderiza`, rx.test(txt()));
}

// 7) 404
await goto(w, '/rota-que-nao-existe');
ok('404 renderiza', /não encontrada|não existe/i.test(txt()));
ok('404 é noindex', (doc.querySelector('meta[name=robots]')?.getAttribute('content') || '').includes('noindex'));

// 8) login admin (noindex)
await goto(w, '/admin/login');
ok('/admin/login renderiza', /Painel Administrativo/.test(txt()));
ok('/admin/login é noindex', (doc.querySelector('meta[name=robots]')?.getAttribute('content') || '').includes('noindex'));

/* ------------------------------------------------------------ login flow */
const user = doc.querySelector('#user');
const pass = doc.querySelector('#pass');
setInput(w, user, 'Admin');
setInput(w, pass, 'Admin577');
doc.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
await wait(600);
ok('login admin funciona', /Dashboard/.test(txt()) && /Produção editorial|Visão geral/.test(txt()), txt().slice(0, 100));

/* ------------------------------------------------------------ sitemap in-browser */
const xml = w.eval('So_xml()');
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
ok('So_xml(): 22 URLs', urls.length === 22, `${urls.length}`);
ok('So_xml(): domínio correto', urls.every((u) => u.startsWith('https://simples-oculto.blog.vercel.app')));
ok('So_xml(): contém artigos', urls.some((u) => u.includes('/artigo/')));
ok('So_xml(): contém categorias', urls.filter((u) => u.includes('/categoria/')).length === 4);
ok('So_xml(): sem /admin', !urls.some((u) => u.includes('/admin')));
const robots = w.eval('So_robots()');
ok('So_robots(): aponta sitemap absoluto', robots.includes('Sitemap: https://simples-oculto.blog.vercel.app/sitemap.xml'));
ok('So_robots(): bloqueia /admin', /Disallow: \/admin/.test(robots));

/* ------------------------------------------------------------ página SEO do painel */
await goto(w, '/admin/seo');
const seoTxt = txt();
ok('/admin/seo renderiza', /SEO e Sitemap/.test(seoTxt), seoTxt.slice(0, 120));
ok('/admin/seo lista URLs', /URLs que entram no sitemap/.test(seoTxt));
const btns = [...doc.querySelectorAll('button')].map((b) => b.textContent.trim());
ok('/admin/seo tem botão gerar', btns.some((b) => b.includes('Gerar sitemap.xml')), btns.join(' | ').slice(0, 200));
ok('/admin/seo tem aviso de desatualizado', /desatualizado/.test(seoTxt));

/* ------------------------------------------------------------ editor mobile */
await goto(w, '/admin/artigos/novo');
const edTxt = txt();
ok('editor novo artigo renderiza', /Novo artigo/.test(edTxt));
const styleTags = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
ok('editor: .input com min-height 44px', /\.input \{ min-height: 2\.75rem; \}/.test(styleTags));
ok('editor: fonte 1rem no mobile', /@media \(max-width: 767px\) \{ \.input \{ font-size: 1rem; \} \}/.test(styleTags));
const smallTargets = [...doc.querySelectorAll('button')].filter((b) => {
  const c = b.className || '';
  return /py-1\b|p-1\b/.test(c);
});
ok('editor: sem botões com padding 4px', smallTargets.length === 0, smallTargets.map(b=>b.className).slice(0,3).join(' | '));

/* ------------------------------------------------------------ painel: tabelas viram cartões */
await goto(w, '/admin/artigos');
ok('admin/artigos: versão cartão (lg:hidden)', /lg:hidden/.test(doc.querySelector('#root').innerHTML));
await goto(w, '/admin/categorias');
ok('admin/categorias: versão cartão', /space-y-3 lg:hidden/.test(doc.querySelector('#root').innerHTML));
await goto(w, '/admin/configuracoes');
ok('admin/configuracoes renderiza', /Configurações do site/.test(txt()));

/* ------------------------------------------------------------ publicar => sitemap */
await goto(w, '/admin/artigos/novo');
setInput(w, doc.querySelector('input.input'), 'Teste de artigo mobile');
const inputs = [...doc.querySelectorAll('input.input')];
setInput(w, inputs[1], 'Subtítulo de teste');
setInput(w, inputs[2], 'teste-artigo-mobile');
const tas = [...doc.querySelectorAll('textarea.input')];
setInput(w, tas[0], 'Resumo do artigo de teste.');
setInput(w, tas[1], 'Conteúdo de teste com mais de algumas palavras.');
await wait(200);
let downloads = 0;
const origClick = w.HTMLAnchorElement.prototype.click;
w.HTMLAnchorElement.prototype.click = function () { if (this.download) downloads++; };
const pubBtn = [...doc.querySelectorAll('button')].find((b) => b.textContent.includes('Publicar'));
pubBtn.click();
await wait(900);
ok('publicar cria o artigo', w.eval('nn().some(a=>a.slug==="teste-artigo-mobile"&&a.status==="publicado")'));
ok('publicar baixa o sitemap.xml automaticamente', downloads >= 1, `downloads=${downloads}`);
const urls2 = [...w.eval('So_xml()').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
ok('sitemap atualizado com o novo artigo', urls2.includes('https://simples-oculto.blog.vercel.app/artigo/teste-artigo-mobile'), `${urls2.length} urls`);
w.HTMLAnchorElement.prototype.click = origClick;

// artigo publicado aparece no site
await goto(w, '/artigos');
ok('artigo novo aparece na listagem do site', /Teste de artigo mobile/.test(txt()));

/* ------------------------------------------------- auditoria de layout */
const fixed = [...doc.querySelectorAll('[style]')].filter((e) => /width\s*:\s*\d{3,}px/.test(e.getAttribute('style') || ''));
ok('sem largura fixa grande em style', fixed.length === 0, fixed.slice(0, 2).map((e) => e.getAttribute('style')).join(' | '));

/* ---------------------------------------------------------------- saída */
console.log('\n=== RESULTADOS ===');
for (const [st, name, extra] of results) console.log(`${st.padEnd(5)} ${name}${extra ? '  → ' + extra : ''}`);
const fails = results.filter((r) => r[0] === 'FALHA');
console.log(`\n${results.length - fails.length}/${results.length} passaram`);
if (logs.length) { console.log('\n=== LOGS DE ERRO ==='); console.log([...new Set(logs)].slice(0, 10).join('\n')); }
process.exit(fails.length ? 1 : 0);
