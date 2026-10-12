# Simples Oculto — Tecnologia, Curiosidades, Esoterismo e Mistérios

Blog editorial sobre tecnologia e IA, curiosidades e descobertas, esoterismo e
espiritualidade, mistérios e teorias da conspiração.

Site publicado originalmente na Arena e espelhado neste repositório para
hospedagem estática (GitHub Pages ou qualquer servidor de arquivos estáticos).

## Estrutura

```
├── index.html            # App React (Vite) com JS e CSS embutidos
└── images/
    ├── hero-mystic.jpg   # capa / favicon
    └── articles/         # capas dos artigos (7 imagens)
```

## Como funciona

- **React SPA** empacotada com Vite — todo o JS e o CSS (Tailwind compilado)
  estão embutidos no `index.html`; não há dependência de CDN em runtime.
- **Roteamento por hash (`#/artigos`, `#/artigo/...`)** — funciona em qualquer
  subpasta (ex.: GitHub Pages de projeto) e em refresh/deep-link sem precisar de
  regras de rewrite no servidor.
- **Caminhos de imagens relativos** (`images/...`) — o site funciona na raiz do
  domínio ou dentro de uma subpasta, sem ajustes.

## Abrir localmente

Basta abrir o `index.html` em um navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000/
```

## GitHub Pages

O repositório já está pronto para Pages:

1. Em `Settings → Pages`, escolha **Deploy from a branch**.
2. Branch `main`, pasta `/ (root)`, e **Save**.
3. O site será publicado em `https://<usuario>.github.io/<repo>/`.

> Como o roteamento é por hash, nenhum `404.html` ou regra extra é necessária.

## Observações

- **Sem JavaScript a página fica em branco** (é uma SPA React). Serviços de
  screenshot que executam JS (Microlink etc.) renderizam normalmente; se você
  precisar de um snapshot puramente estático (HTML já renderizado), é possível
  pré-renderizar o DOM — peça e eu gero.
- As URLs canônicas/SEO (`og:image`, JSON-LD) apontam para o domínio de
  produção `https://simplesoculto.com.br` — foram mantidas como no original.
- Fontes carregadas do Google Fonts (Playfair Display + Inter).
- As imagens dos artigos de tecnologia usam Pexels (URLs externas); as demais
  estão na pasta `images/`.
