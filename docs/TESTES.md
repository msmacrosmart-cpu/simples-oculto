# Testes

O site é um único `index.html` com JS e CSS embutidos. Isso facilita publicar,
mas significa que **um erro de sintaxe no bundle derruba todas as páginas** e
que **uma classe Tailwind usada sem regra CSS correspondente simplesmente não
aplica** — sem erro no console. Os testes abaixo existem para pegar esses dois
casos, mais o comportamento das rotas.

```bash
npm install        # instala o jsdom (única dependência de desenvolvimento)

npm run check      # rápido, sem dependências: sintaxe do bundle + classes órfãs
npm run test:css   # auditoria de CSS renderizando todas as rotas (jsdom)
npm run test:app   # suíte funcional (64 asserções, jsdom)
npm test           # os três, em ordem
```

## `scripts/check-bundle.mjs` — sem dependências

1. Extrai o bundle inline e faz o parse com `vm.Script`.
2. Varre todos os `className` do bundle (incluindo os de template literal e os
   `accent` de categoria) e confirma que existe uma regra `.classe` no `<style>`.

```
✔ bundle: sintaxe OK (416.239 caracteres)
✔ CSS: 385 classes usadas, todas com regra correspondente
```

## `tests/css-audit.mjs` — jsdom

Renderiza **todas** as rotas (públicas + painel, com login) num DOM simulado e
compara cada token de `class` do DOM final com o CSS. Pega classes que só
aparecem em combinações dinâmicas (status de artigo, categoria, paginação),
que a checagem estática não vê.

```
tokens de classe renderizados: 415
sem CSS correspondente: 0
```

## `tests/smoke.mjs` — jsdom

64 asserções divididas em:

| Grupo | Exemplos do que é verificado |
| --- | --- |
| Rotas públicas | render, `h1`, canonical absoluto, `meta robots` (`noindex` onde deve), JSON-LD por tipo |
| Artigo | `BlogPosting` + `BreadcrumbList`, `og:image` absoluto, sumário, relacionados |
| Marca | favicons com caminho absoluto, logo como imagem com `width/height` e `object-contain`, nenhum caminho `images/...` relativo |
| Imagens | `alt` em todas, `srcset` WebP nas capas locais, `srcset` nas do Pexels, altura reservada (sem CLS), no máximo 3 imagens `eager` |
| Layout | grid de categorias responsivo, nenhuma largura fixa grande em `style`, nenhum link `#/…`, nenhum botão com padding de 4 px |
| Painel | login (`Admin` / `Admin577`), listas em cartão no mobile (`lg:hidden`), editor com `.input` de 44 px e fonte 1 rem abaixo de 768 px |
| Publicação | criar artigo, publicar, baixar o `sitemap.xml` automaticamente e ver o slug novo no XML e na listagem do site |
| SEO | `So_xml()` com 22 URLs, domínio correto, sem `/admin`; `So_robots()` com `Sitemap:` absoluto e `Disallow: /admin` |

```
64/64 passaram
```

## Ambiente

Os testes rodam em **jsdom**, que não tem motor de CSS: ele valida
*sintaxe, estrutura e comportamento*, **não** o resultado visual. A conferência
de layout (largura, sobreposição, corte) continua sendo manual — ver
`docs/RESPONSIVIDADE.md`.

Para rodar o site:

```bash
npm start          # servidor estático com as regras de rota real
```
