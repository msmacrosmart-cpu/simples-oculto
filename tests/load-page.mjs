import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = resolve(ROOT, 'index.html');
const OPEN = '<script type="module" crossorigin>';

/**
 * O bundle é um módulo ES. Nem todos os ambientes de teste executam
 * `<script type="module">`, então a página de teste usa um script clássico
 * movido para o fim do <body> (o que preserva a semântica de execução
 * diferida que o `type="module"` já tinha).
 */
export function buildTestHtml() {
  const src = readFileSync(INDEX, 'utf8');
  const i = src.indexOf(OPEN);
  const j = src.indexOf('</script>', i);
  if (i < 0 || j < 0) throw new Error('Não encontrei o bundle inline em index.html');
  const body = src.slice(i + OPEN.length, j);
  const rest = src.slice(0, i) + src.slice(j + 9);
  return rest.replace('</body>', () => `<script>${body}</script>\n  </body>`);
}

/** Cria o jsdom da aplicação já com os shims que o SPA precisa. */
export async function buildDom({ JSDOM }) {
  const html = buildTestHtml();
  const logs = [];
  const dom = new JSDOM(html, {
    url: 'https://simples-oculto.blog.vercel.app/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      const ce = window.console.error.bind(window.console);
      window.console.error = (...a) => {
        logs.push(a.map(String).join(' ').slice(0, 300));
        if (process.env.SO_VERBOSE) ce(...a);
      };
      window.addEventListener('error', (e) => logs.push('ERR ' + (e.error?.stack || e.message)));
      window.URL.createObjectURL = () => 'blob:x';
      window.URL.revokeObjectURL = () => {};
    },
  });
  return { dom, logs, window: dom.window, doc: dom.window.document };
}

/** Troca de rota pelo histórico (o router usa popstate). */
export async function goto(window, path, ms = 350) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new window.PopStateEvent('popstate', { state: {} }));
  await new Promise((r) => setTimeout(r, ms));
}

export function setInput(window, el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

export { ROOT, INDEX };
