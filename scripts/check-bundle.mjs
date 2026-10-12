#!/usr/bin/env node
/**
 * Verificação rápida do `index.html` — sem dependências externas.
 *
 *   1. Extrai o bundle inline e valida a sintaxe com `vm.Script`
 *      (um erro de sintaxe derruba o site inteiro, e o navegador não avisa
 *      de forma útil em código minificado).
 *   2. Confere se todas as classes usadas nos `className` têm regra CSS
 *      correspondente no `<style>` embutido.
 *
 * Uso:  node scripts/check-bundle.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
let failed = false;

/* ---------------------------------------------------- 1) sintaxe do bundle */
const OPEN = '<script type="module" crossorigin>';
const i = html.indexOf(OPEN);
const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) {
  console.error('✖ Não encontrei o bundle inline (tag <script type="module" crossorigin>).');
  process.exit(1);
}
const js = html.slice(i + OPEN.length, j);
try {
  new vm.Script(js, { filename: 'bundle.js' });
  console.log(`✔ bundle: sintaxe OK (${js.length.toLocaleString('pt-BR')} caracteres)`);
} catch (e) {
  failed = true;
  console.error('✖ bundle: erro de sintaxe');
  console.error('  ' + String(e.stack || e.message).split('\n').slice(0, 4).join('\n  '));
  const m = /bundle\.js:(\d+)/.exec(String(e.stack || ''));
  if (m) {
    const lines = js.split('\n');
    const n = Number(m[1]);
    console.error(`  trecho (linha ${n}):`);
    console.error('  …' + lines[n - 1].slice(0, 400) + '…');
  }
}

/* ------------------------------------------------------ 2) classes sem CSS */
const k = html.indexOf('<style>');
const l = html.indexOf('</style>', k);
const css = html.slice(k + 7, l);

const esc = (t) => t.replace(/[/\][().%!#&>+~*,:]/g, (c) => '\\' + c);
const tokens = new Set();
const body = html.slice(i, j);
for (const m of body.matchAll(/className\s*:\s*(?:"([^"]*)"|`([^`]*)`|\{`([^`]*)`\})/g)) {
  const raw = (m[1] || m[2] || m[3] || '').replace(/\$\{[^}]*\}/g, ' ');
  for (const t of raw.split(/\s+/)) if (t) tokens.add(t);
}
// acentos de categoria ficam em variáveis (d.accent, qh.accent etc.)
for (const m of body.matchAll(/accent\s*:\s*"([^"]*)"/g)) {
  for (const t of m[1].split(/\s+/)) if (t) tokens.add(t);
}

const missing = [...tokens].filter((t) => !css.includes('.' + esc(t)));
if (missing.length) {
  failed = true;
  console.error(`✖ CSS: ${missing.length} classe(s) sem regra correspondente:`);
  for (const t of missing) console.error('    ' + t);
  console.error('  → adicione as regras no bloco @layer utilities do <style>.');
} else {
  console.log(`✔ CSS: ${tokens.size} classes usadas, todas com regra correspondente`);
}

process.exit(failed ? 1 : 0);
