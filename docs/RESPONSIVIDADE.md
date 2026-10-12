# Responsividade mobile — Simples Oculto

Este documento descreve **o que foi reorganizado por largura de tela**, como
reproduzir a validação e o que ainda depende de conferência visual em
dispositivo/navegador real.

---

## 1. Breakpoints usados

O CSS é Tailwind (breakpoints padrão) mais um bloco utilitário próprio no
final do `<style>` do `index.html`:

| Nome | Largura | Uso |
| --- | --- | --- |
| — (base) | 0 – 639 px | layout de uma coluna, menu hambúrguer, cartões empilhados |
| `sm:` | ≥ 640 px (`40rem`) | 2 colunas, tipografia maior, mais respiro |
| `md:` | ≥ 768 px (`48rem`) | ajustes pontuais de espaçamento |
| `lg:` | ≥ 1024 px (`64rem`) | 3–4 colunas, tabelas, grids `[conteúdo | sidebar]` |
| extra | ≤ 359 px | grade de categorias vira 1 coluna (`.so-cols-narrow`) |
| extra | ≤ 767 px | campos de formulário com `font-size:1rem` (mata o zoom automático do iOS) |

Classes e regras próprias (declaradas em `@layer utilities`):

```css
.so-menu   { max-height: calc(100dvh - 4.5rem); overflow-y: auto }  /* menu mobile com rolagem */
.so-break  { overflow-wrap: anywhere }                                /* slugs/títulos longos não estouram */
.so-cols-narrow { grid-template-columns: minmax(0,1fr) }              /* ≤ 359px */
html, body { overflow-x: clip }                                       /* mata rolagem horizontal indesejada */
[id]       { scroll-margin-top: 6rem }                                /* âncora não fica sob o header fixo */
:focus-visible { outline: 2px solid #fbbf24; outline-offset: 2px }    /* foco visível na cor da marca */
```

---

## 2. O que muda em cada tela

### Home (`/`)
| Bloco | Mobile (< 640) | ≥ 640 | ≥ 1024 |
| --- | --- | --- | --- |
| Cabeçalho | logo + botão hambúrguer; menu abre em painel (`so-menu`, rolagem interna) | idem | links inline, sem hambúrguer |
| Herói | 1 coluna, imagem abaixo do texto | — | `lg:grid-cols-2` |
| Destaques (carrossel) | altura proporcional, setas com 44 px | — | 2 colunas |
| Grade de categorias | `grid-cols-2` (1 coluna ≤ 359 px) | `sm:grid-cols-4` | idem |
| Grade de artigos | 1 coluna | `sm:grid-cols-2` | `lg:grid-cols-3` (4 na faixa "Mais lidos") |
| Newsletter | input + botão empilhados, `pr-28` reservado para o botão | — | — |

### Listagem (`/artigos`), categoria (`/categoria/:slug`), busca (`/pesquisa`)
- Grade `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3`.
- Filtros/pílulas em linha com rolagem horizontal quando não cabem (sem cortar
  texto, sem rolagem na página).
- Paginação com alvos de toque de 44 px e `Voltar/Avançar` sempre visíveis.

### Artigo (`/artigo/:slug`)
- Estrutura `grid-cols-1 → lg:grid-cols-[1fr_280px]` (conteúdo + sumário lateral).
- O **sumário aparece acima do texto no mobile** (`mb-8 lg:hidden`) e na
  lateral no desktop (`hidden lg:block`) — sem duplicar conteúdo para o leitor
  de tela de forma confusa (o sumário mobile é o mesmo componente).
- Capa `aspect-[16/9]`, `object-cover`, com `width`/`height` declarados
  (sem deslocamento de layout).
- Tipografia do corpo: `text-[1.05rem]` no mobile (leitura confortável) e
  `sm:text-base/lg` acima; títulos `text-[1.75rem] → sm:text-2xl → lg:text-4xl`.
- Blocos de código e listas com rolagem própria (`.so-break` em slugs longos).
- Botões de compartilhamento com 44 px e rótulo visível.

### Painel (`/admin/*`)
| Tela | Mobile | Desktop |
| --- | --- | --- |
| Menu lateral | `lg:hidden` na versão topo/abas; navegação por ícones com 44 px | coluna fixa |
| **Artigos** | **lista em cartões** (`space-y-* lg:hidden`): título, `categoria · data`, selo de status e 4 botões de 44 px (Ver / Editar / Duplicar / Excluir) | tabela (`hidden … lg:block`, `overflow-x-auto`) |
| **Categorias** | **lista em cartões** com Editar (44 px) e Excluir (44 × 44) | tabela |
| Editor | campos empilhados (`lg:grid-cols-[1fr_360px]` só no desktop), `.input` com `min-height:2.75rem` e fonte 1rem no mobile | 2 colunas com pré-visualização |
| Configurações / SEO | cartões empilhados, botões de 40–44 px, blocos com `so-break` para não estourar | idem com mais colunas |

### Login (`/admin/login`)
Cartão central com largura máxima, campos de 44 px, botão de envio em largura
total e foco na cor da marca.

---

## 3. Alvos de toque, tipografia e imagens

- **Nenhum botão com menos de 40 px de altura** foi deixado para trás; os
  botões das listas do painel foram elevados para **44 px** (`h-11` / `w-11`),
  e os de ação receberam `min-w-[44px]`.
- Campos (`.input`) têm `min-height: 2.75rem` e, abaixo de 768 px,
  `font-size: 1rem` — evita o zoom automático do Safari no foco.
- **Imagens**: as capas locais foram reconvertidas e agora têm variantes WebP
  (`-480`, `-768`, `-1200`) servidas por `srcset`; as capas do Pexels ganharam
  `srcset` com 480/768/1024/1400. A logo do cabeçalho é servida em PNG com
  `width`/`height` declarados e `object-contain` (nunca é cortada nem deformada).
  `hero-mystic.jpg` caiu de 262 KB para 152 KB; as capas, de ~300 KB para
  ~90–190 KB (JPEG) com WebP paralelo de 5–130 KB.

---

## 4. Como validar nas 8 larguras pedidas

Larguras alvo: **320, 360, 375, 390, 430, 768, 1024, 1440 px**.

### No navegador (Chrome/Edge/Firefox)
1. `npm start` e abra a URL do preview.
2. `F12` → **Ctrl/Cmd + Shift + M** (modo dispositivo).
3. Em *Dimensions* escolha **Responsive** e digite cada largura da lista
   (a altura pode ficar em 720 px).
4. Em cada largura, abra: `/`, `/artigos`, `/categoria/tecnologia`,
   `/artigo/numerologia-origem-significado-numeros`, `/pesquisa?q=sonhos`,
   `/admin/login` → `/admin` → `/admin/artigos` → `/admin/artigos/novo` →
   `/admin/categorias` → `/admin/configuracoes` → `/admin/seo`.
5. Em todas elas, confira a lista do item 5 abaixo.

### Verificação automática de sintaxe/classes (já usada neste repo)
O build é um único `index.html` com JS e CSS embutidos, então depois de **qualquer**
edição vale rodar:

```bash
node scripts/check-bundle.mjs      # 1) acorn parse do bundle  2) classes sem CSS
```

Ele extrai o `<script>` embutido, faz o parse (erro de sintaxe quebraria a
página inteira) e depois renderiza todas as rotas num DOM simulado, conferindo
se **todo `class` usado tem regra CSS correspondente** — foi assim que
descobrimos dezenas de classes órfãs deixadas por edições anteriores.

### Suíte funcional
O mesmo harness roda 64 asserções (render por rota, canonical, JSON-LD,
`noindex`, login, publicação, regeneração do sitemap, logo, `srcset`, alvos de
toque). Ver `docs/TESTES.md`.

---

## 5. Checklist manual por largura

- [ ] **Nada de rolagem horizontal** na página (só dentro de carrosséis/tabelas).
- [ ] **Nenhum texto cortado** (`truncate` só onde é intencional) ou sobreposto.
- [ ] Títulos de artigo com até 2 linhas legíveis, sem invadir o botão ao lado.
- [ ] Imagens **proporcionais** — sem achatamento nem corte estranho.
- [ ] Menu mobile abre, navega e fecha; o item ativo fica destacado.
- [ ] Campo de busca utilizável: sem zoom no iOS, botão alcançável.
- [ ] Leitura do artigo confortável (linhas ~45–75 caracteres).
- [ ] No painel: criar, editar, pré-visualizar e publicar um artigo **só com o
      toque**; seleção de categoria e upload de imagem funcionam.
- [ ] Modais/menus cabem na tela e têm botão de fechar com 44 px.
- [ ] Botões não encostam uns nos outros (mín. 8 px de folga).

---

## 6. Limitação conhecida desta entrega

A validação foi feita com **parse do bundle + renderização em DOM simulado +
auditoria estática de CSS** (não havia navegador com motor de layout disponível
no ambiente onde o trabalho foi feito). Isso garante:

- o JS executa sem erros em todas as rotas;
- toda classe usada tem CSS correspondente;
- a estrutura muda por breakpoint conforme a tabela acima.

**Não** substitui olhar a página em um dispositivo real: espaçamentos finos,
quebras de linha e o comportamento do teclado virtual ainda merecem a passada
manual do item 5 antes de considerar 100% concluído.
