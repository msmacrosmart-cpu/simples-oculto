# Simples Oculto — Tecnologia, Curiosidades, Esoterismo e Mistérios

Blog editorial sobre tecnologia e IA, curiosidades e descobertas, esoterismo e
espiritualidade, mistérios e teorias da conspiração.

**URL de produção:** <https://simples-oculto.blog.vercel.app>

Site de página única (React + Tailwind, JS e CSS embutidos no `index.html`),
hospedado como estático. Não há servidor, banco de dados nem build em runtime.

---

## Sumário

- [Estrutura do repositório](#estrutura-do-repositório)
- [Rodando localmente](#rodando-localmente)
- [Rotas](#rotas)
- [Marca: logo e favicon](#marca-logo-e-favicon)
- [Cores](#cores)
- [Imagens](#imagens)
- [SEO e Google Search Console](#seo-e-google-search-console)
- [Responsividade](#responsividade)
- [Testes](#testes)
- [Deploy](#deploy)
- [Painel administrativo](#painel-administrativo)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Estrutura do repositório

```
├── index.html                 # aplicação inteira (HTML + CSS + JS embutidos)
├── 404.html                   # fallback para deep-link (GitHub Pages etc.)
├── robots.txt                 # regras de rastreamento + URL absoluta do sitemap
├── sitemap.xml                # gerado (22 URLs: 6 estáticas + 4 categorias + 12 artigos)
├── site.webmanifest           # PWA/ícones
├── vercel.json                # reescrita para rotas com caminho real
├── images/
│   ├── logo.png               # logo (substitua pela sua — veja abaixo)
│   ├── favicon-{16,32,64}.png # gerados a partir da logo
│   ├── apple-touch-icon.png   # 180×180
│   ├── android-chrome-{192,512}.png
│   ├── og-image.jpg           # 1200×630 (Open Graph / Twitter)
│   ├── hero-mystic.jpg
│   └── articles/              # capas (+ variantes -480/-768/-1200 .webp)
├── scripts/
│   ├── check-bundle.mjs       # sintaxe do bundle + classes sem CSS (sem deps)
│   ├── generate-sitemap.mjs   # regenera sitemap.xml
│   ├── generate-images.py     # otimiza capas e gera ícones/og-image (Pillow)
│   └── serve.mjs              # servidor estático local
├── tests/
│   ├── load-page.mjs          # helper: carrega o index.html no jsdom
│   ├── css-audit.mjs          # toda classe usada tem CSS?
│   └── smoke.mjs              # 64 asserções de comportamento
├── docs/
│   ├── SEO-SEARCH-CONSOLE.md  # verificar domínio, enviar sitemap, indexação
│   ├── RESPONSIVIDADE.md      # o que muda por largura + checklist manual
│   └── TESTES.md              # como rodar e o que cada teste cobre
└── .github/workflows/
    └── sitemap.yml            # mantém o sitemap.xml atualizado
```

---

## Rodando localmente

```bash
npm start          # servidor estático com as regras de rota real
# → http://localhost:4173
```

Também funciona com qualquer servidor de arquivos, desde que as rotas com
caminho real (`/artigos`, `/artigo/<slug>`) caiam no `index.html`:

```bash
python3 -m http.server 8000     # funciona para a home; para deep-link use npm start
```

---

## Rotas

Rotas com **caminho real** (sem `#/`), o que é exigido para indexação
adequada pelo Google:

| Rota | Indexável | Observação |
| --- | :-: | --- |
| `/` | ✔ | JSON-LD `WebSite` |
| `/artigos` | ✔ | JSON-LD `ItemList` |
| `/categoria/:slug` | ✔ | uma por categoria |
| `/artigo/:slug` | ✔ | JSON-LD `BlogPosting` + `BreadcrumbList` |
| `/sobre`, `/contato` | ✔ | |
| `/politica-de-privacidade`, `/termos-de-uso` | ✔ | |
| `/pesquisa` | ✖ | `noindex` — resultado interno, sem valor de indexação |
| `/admin`, `/admin/*` | ✖ | `noindex` + `Disallow: /admin` no `robots.txt` |
| qualquer outra | ✖ | 404 com `noindex` |

Cada rota define no runtime: `<title>`, `<meta name="description">`,
`<link rel="canonical">` absoluto, `meta robots`, `og:*`, `twitter:*` e JSON-LD.

---

## Marca: logo e favicon

A logo do cabeçalho e o favicon vêm do mesmo arquivo: **`images/logo.png`**.

> A imagem atual é um **placeholder** gerado localmente (marca + wordmark
> "Simples Oculto" no amarelo da marca). Substitua pelo arquivo que você
> enviou e rode o script para regenerar os ícones em todos os tamanhos.

```bash
# 1) coloque a sua logo em images/logo.png
#    (PNG com fundo transparente; se for horizontal, o símbolo deve ficar à
#     esquerda — o script usa a área quadrada da esquerda para o favicon)

# 2) gere os ícones
python3 -m venv .venv && .venv/bin/pip install pillow
python3 scripts/generate-images.py
```

Isso escreve `favicon-16.png`, `favicon-32.png`, `favicon-64.png`,
`apple-touch-icon.png` (180), `android-chrome-192.png`,
`android-chrome-512.png` e `og-image.jpg` (1200×630).

O cabeçalho usa a imagem com `width`/`height` declarados e `object-contain`
(proporção preservada, sem corte). Se o arquivo falhar ao carregar, o
componente volta sozinho para o wordmark em texto.

---

## Cores

| Uso | Cor | Tailwind |
| --- | --- | --- |
| Amarelo da marca ("Oculto") | `#FBBF24` | `amber-400` |
| Texto principal | `#FAFAFA` | `zinc-50` |
| Texto secundário | `#A1A1AA` | `zinc-400` |
| Fundo | `#09090B` | `zinc-950` |
| Foco visível | `#FBBF24` | — |

Todo antigo destaque violeta/roxo foi trocado pelo amarelo da marca: botões,
links, ícones, bordas de foco e os gradientes de acento (a categoria
*Tecnologia* era `from-violet-500 to-indigo-500` e agora é
`from-amber-500 to-amber-300`).

As categorias mantêm um acento cada — *Tecnologia* (âmbar), *Curiosidades*
(âmbar→laranja), *Esoterismo* (magenta), *Mistérios* (verde) — para continuar
distinguíveis na home. Se preferir a paleta 100% âmbar, é uma linha no
`Yt=` (categorias) do `index.html`.

---

## Imagens

- Capas locais reconvertidas para 1200 px de largura (JPEG progressivo q80) e
  com variantes WebP `-480`, `-768`, `-1200` servidas por `srcset`.
- Capas do Pexels ganharam `srcset` com 480/768/1024/1400 via reescrita dos
  parâmetros `w=`/`h=` da URL.
- `hero-mystic.jpg`: 262 KB → 152 KB.
- Todas as imagens declaram `width`/`height` ou têm altura fixa no CSS (sem
  deslocamento de layout); só o carrossel e a logo carregam sem `lazy`.
- `og-image.jpg` 1200×630 gerado a partir do herói (85 KB).

---

## SEO e Google Search Console

Ver **[`docs/SEO-SEARCH-CONSOLE.md`](docs/SEO-SEARCH-CONSOLE.md)** para o
passo a passo completo: verificação de domínio, envio do sitemap, inspeção de
URL e solicitação de indexação.

Resumo do que já está no código:

- `sitemap.xml` válido (padrão sitemaps.org 0.9, com `image:` nas capas).
- `robots.txt` com `Sitemap: https://simples-oculto.blog.vercel.app/sitemap.xml`
  e **sem** bloqueio de CSS/JS/imagens (o Google precisa renderizar a página).
- Canonical absoluto, `meta robots`, `og:*`, `twitter:*` e JSON-LD por rota.
- O painel **regenera e baixa o `sitemap.xml` automaticamente ao publicar** e
  avisa quando o arquivo servido está desatualizado.

> **Não há promessa de indexação ou posicionamento.** Um sitemap é um convite à
> descoberta; quem decide é o Google. Da mesma forma, **não há sitemap do
> Google News** — ele é voltado a veículos jornalísticos com regras próprias e
> só faria sentido com produção diária e equipe editorial (detalhado no doc).

---

## Responsividade

Ver **[`docs/RESPONSIVIDADE.md`](docs/RESPONSIVIDADE.md)**.

Mobile-first: uma coluna por padrão, 2 colunas a partir de 640 px, 3–4 e
grids `[conteúdo | sidebar]` a partir de 1024 px. Menu hambúrguer com
navegação funcionando, tabelas do painel convertidas em **lista de cartões** no
mobile, alvos de toque de 44 px, campos com fonte de 1 rem abaixo de 768 px
(sem zoom automático no iOS) e `overflow-x: clip` para eliminar rolagem
horizontal.

Larguras validadas: **320, 360, 375, 390, 430, 768, 1024, 1440 px**.

---

## Testes

```bash
npm install
npm test           # check-bundle + css-audit + smoke (64 asserções)
```

Ver **[`docs/TESTES.md`](docs/TESTES.md)**.

---

## Deploy

### Vercel

O `vercel.json` já traz a reescrita para rotas com caminho real:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### GitHub Pages

1. `Settings → Pages` → **Deploy from a branch** → `main` / `/ (root)`.
2. O `404.html` faz o papel da reescrita em deep-link.
3. Ajuste `SITE_URL` no workflow e/ou rode
   `SITE_URL=https://<usuario>.github.io/<repo> npm run sitemap`.

> Se publicar em subpasta, os caminhos absolutos (`/images/...`, `/artigo/...`)
> precisam ser ajustados — eles assumem a raiz do domínio.

---

## Painel administrativo

- Endereço: `/admin/login` — usuário **`Admin`**, senha **`Admin577`**.
- Funciona no celular: listas de artigos e categorias viram cartões com botões
  de 44 px; o editor empilha os campos e mantém a pré-visualização.
- Ao **publicar**, o `sitemap.xml` é gerado e baixado automaticamente. Para que
  o arquivo passe a valer para os visitantes, salve-o na raiz do repositório
  (ou exporte o JSON em *SEO e Sitemap* → `data/articles.json` e rode
  `npm run sitemap`).

> **Importante:** os artigos criados no painel ficam no `localStorage` do
> navegador que os criou. Eles **não** aparecem para outros visitantes nem no
> sitemap público até serem publicados no build. Isso é uma limitação do
> projeto estático, não um bug de sincronia.

---

## Limitações conhecidas

- **Sem JavaScript a página fica em branco** (é uma SPA React). Serviços que
  executam JS renderizam normalmente.
- **Conteúdo do painel é local** (`localStorage`), como explicado acima.
- A validação de layout foi feita por parse + DOM simulado + auditoria de CSS;
  a conferência visual final em dispositivo real ainda vale o checklist de
  `docs/RESPONSIVIDADE.md`.
- Fontes (Playfair Display + Inter) vêm do Google Fonts.
