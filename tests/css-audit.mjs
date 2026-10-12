/**
 * Auditoria de CSS: renderiza todas as rotas num DOM simulado e verifica se
 * **toda classe usada tem regra CSS correspondente**.
 *
 * Isso importa porque o CSS do projeto é um snapshot pré-compilado do
 * Tailwind: classes adicionadas depois da compilação simplesmente não
 * existem, e o layout "quebra em silêncio" (a página continua abrindo, mas
 * sem o estilo). Foi exatamente assim que encontramos 30+ classes órfãs.
 *
 * Uso:
 *   npm install
 *   node tests/css-audit.mjs
 */
import { JSDOM } from 'jsdom';
import { buildDom, goto, setInput } from './load-page.mjs';

const { dom, window: w, doc } = await buildDom({ JSDOM });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const esc = (t) => t.replace(/[/\][().%!#&>+~*,:]/g, (c) => '\\' + c);

const ROUTES = [
  '/', '/artigos', '/categoria/tecnologia', '/categoria/curiosidades',
  '/categoria/esoterismo', '/categoria/misterios',
  '/artigo/numerologia-origem-significado-numeros',
  '/artigo/como-funciona-uma-rede-neural',
  '/pesquisa?q=sonhos', '/sobre', '/contato',
  '/politica-de-privacidade', '/termos-de-uso', '/rota-inexistente',
];
const ADMIN = ['/admin', '/admin/artigos', '/admin/artigos/novo', '/admin/categorias', '/admin/configuracoes', '/admin/seo'];

const seen = new Map();   // token -> rota
let runtime = '';         // <style> injetado em runtime (ex.: classe .input do editor)

function collect(route) {
  for (const st of doc.querySelectorAll('style')) runtime += '\n' + st.textContent;
  for (const el of doc.querySelectorAll('*')) {
    const cls = el.getAttribute('class');
    if (!cls) continue;
    for (const t of cls.split(/\s+/)) if (t && !seen.has(t)) seen.set(t, route);
  }
}

await wait(1200);
collect('/');
for (const r of ROUTES) { await goto(w, r); collect(r); }

await goto(w, '/admin/login');
collect('/admin/login');
setInput(w, doc.querySelector('#user'), 'Admin');
setInput(w, doc.querySelector('#pass'), 'Admin577');
doc.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
await wait(700);
for (const r of ADMIN) { await goto(w, r); collect(r); }

const css = dom.window.document.querySelector('style').textContent + '\n' + runtime;
const IGNORE = /^lucide/;   // nomes de ícone, não precisam de CSS
const missing = [...seen].filter(([t]) => !IGNORE.test(t) && !css.includes('.' + esc(t)));

console.log(`tokens de classe renderizados: ${seen.size}`);
console.log(`sem CSS correspondente: ${missing.length}`);
for (const [t, route] of missing) console.log(`  FALTA  ${t}   (em ${route})`);
process.exit(missing.length ? 1 : 0);
