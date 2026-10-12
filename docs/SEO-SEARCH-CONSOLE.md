# Google Search Console — Simples Oculto

Guia de verificação de domínio, envio de sitemap e solicitação de indexação.

**URL canônica do site:** `https://simples-oculto.blog.vercel.app`

> ### Antes de tudo: o que este documento **não** promete
>
> - **Nada aqui garante indexação.** O Google decide se, quando e como indexa
>   uma página. Um sitemap é apenas um *convite* à descoberta.
> - **Nada aqui garante posicionamento.** Não existe forma de "forçar" uma
>   posição na busca.
> - **Solicitar indexação acelera o processamento de uma URL conhecida**, não
>   cria obrigação alguma de inclusão no índice.
> - Artigos criados no painel ficam no `localStorage` do navegador que os criou.
>   Eles **não aparecem automaticamente para outros visitantes** nem no sitemap
>   servido ao Google. Para que um artigo entre de fato no sitemap público, ele
>   precisa ser publicado no build (exporte o JSON e rode
>   `npm run sitemap`, ou rode a GitHub Action descrita abaixo).

---

## 1. O que já está pronto no código

| Item | Onde | Situação |
| --- | --- | --- |
| `sitemap.xml` válido (padrão sitemaps.org 0.9) | `sitemap.xml` | gerado por `npm run sitemap` |
| `sitemap.xml` é **regenerado automaticamente ao publicar** | painel → *SEO e Sitemap* | baixa o XML atualizado e avisa quando está desatualizado |
| URL absoluta do sitemap no `robots.txt` | `robots.txt` | `Sitemap: https://simples-oculto.blog.vercel.app/sitemap.xml` |
| Nada de bloqueio acidental | `robots.txt` | só `/admin` e `/pesquisa` são bloqueados |
| `<link rel="canonical">` por rota | `index.html` (runtime) | uma URL canônica por página, absoluta |
| `meta name="robots"` por rota | `index.html` (runtime) | `noindex` em `/pesquisa`, `/admin/*` e 404 |
| `og:*` e `twitter:*` completos | `index.html` (runtime) | título, descrição, URL e imagem absolutos |
| JSON-LD por rota | `index.html` (runtime) | `WebSite`, `BlogPosting`, `BreadcrumbList`, `ItemList` |
| Rotas com caminho real (sem `#/`) | `index.html` | `/artigos`, `/artigo/<slug>`, `/categoria/<slug>` |
| `404.html` + `vercel.json` | raiz | deep-link e refresh funcionam |

### Conferência rápida pelo terminal

```bash
# sitemap bem formado e com a URL absoluta no robots.txt
npm run sitemap

# serve localmente e inspecione
npm start      # http://localhost:4173
```

---

## 2. Verificar a propriedade do domínio

1. Acesse <https://search.google.com/search-console> e faça login.
2. Clique em **Adicionar propriedade**.
3. Escolha **Propriedade de domínio** (cobre todos os subdomínios e protocolos)
   e digite:

   ```
   simples-oculto.blog.vercel.app
   ```

   > O Vercel entrega o site no domínio `*.vercel.app`; a verificação por
   > **propriedade de domínio** exige um registro DNS `TXT`. Se você não tem
   > acesso ao DNS desse host, use **Propriedade de URL (prefixo)** com a URL
   > completa `https://simples-oculto.blog.vercel.app/` — nesse caso os métodos
   > de arquivo HTML e de meta tag ficam disponíveis.

4. Escolha o método de verificação:

   | Método | Como fazer | Quando usar |
   | --- | --- | --- |
   | **Registro DNS TXT** (recomendado) | O GSC mostra um valor `google-site-verification=...`. Crie um registro `TXT` no DNS do domínio com esse valor. | propriedade de domínio; não exige mexer no site |
   | **Arquivo HTML** | Baixe o arquivo de verificação e publique-o na **raiz** do site (ex.: `https://simples-oculto.blog.vercel.app/google1234.html`). | propriedade de URL; você consegue publicar arquivos |
   | **Meta tag HTML** | Copie a `<meta name="google-site-verification" content="...">` para o `<head>` do `index.html`, **antes** do primeiro `<script>`. | propriedade de URL; edição rápida |
   | **Google Analytics / Tag Manager** | Use a conta de GA4/GTM já verificada. | quando a tag já está instalada |

5. Clique em **Verificar**. A confirmação costuma ser imediata para meta tag e
   arquivo HTML; por DNS pode levar alguns minutos (aguarde a propagação).

### Dica: onde colocar a meta tag

No `index.html`, logo após `<meta name="viewport" ...>`:

```html
<meta name="google-site-verification" content="COLE_O_VALOR_DO_GSC_AQUI" />
```

> A verificação é por propriedade, não por página: depois de verificar, **não
> remova** a meta tag/arquivo/DNS. Se remover, a propriedade perde a verificação.

---

## 3. Enviar o sitemap

1. No GSC, com a propriedade já verificada, vá em **Sitemaps** (menu lateral).
2. Em "Adicionar um novo sitemap", digite **somente o caminho**:

   ```
   sitemap.xml
   ```

   (o GSC completa para `https://simples-oculto.blog.vercel.app/sitemap.xml`)
3. Clique em **Enviar**.
4. Aguarde. O status começa como *Não foi possível buscar* ou *Pendente* e
   passa a *Êxito* após o primeiro processamento — isso pode levar de algumas
   horas a alguns dias.

### O que o GSC reporta — e o que não reporta

- **"Êxito"** = o arquivo foi lido e é válido. **Não** significa que as URLs
  foram indexadas.
- A contagem *"URLs descobertas"* costuma ser menor que o total do sitemap e é
  normal: URLs duplicadas, canonizadas para outra URL ou filtradas pelo Google
  não entram na contagem de indexadas.
- Se aparecer *"Não foi possível buscar"*, abra a URL do sitemap no navegador e
  confirme que o XML é servido com `Content-Type: application/xml` ou
  `text/xml` e status `200`.

### Reenvio

**Não é necessário reenviar o sitemap a cada artigo novo.** O Google o relê
periodicamente. Reenvie apenas quando:

- o sitemap mudar de endereço;
- o GSC acusar erro de leitura e você já tiver corrigido;
- você quiser forçar uma releitura imediata após uma mudança grande.

---

## 4. Inspecionar uma URL e solicitar indexação

### 4.1 Inspeção

1. No GSC, use a barra **Inspecionar URL** no topo (ou
   **Inspeção de URL** no menu).
2. Cole a URL completa, por exemplo:

   ```
   https://simples-oculto.blog.vercel.app/artigo/numerologia-origem-significado-numeros
   ```

3. O relatório mostra três blocos importantes:
   - **Cobertura do Googlebot**: se a URL foi rastreada e se está no índice.
   - **URLs canônicas**: a canônica *declarada pela página* e a canônica *escolhida
     pelo Google*. **Elas devem ser iguais.** Se divergirem, o mais comum é
     conteúdo duplicado ou redirect.
   - **Melhorias** (dados estruturados, usabilidade em dispositivos móveis).
4. Clique em **Testar URL ao vivo** para revalidar o HTML atual (não o cache).
   É o caminho certo depois de corrigir um erro.

### 4.2 Solicitar indexação

Dentro do resultado da inspeção existe o botão **Solicitar indexação**. Use-o
quando:

- você acabou de publicar um artigo novo;
- corrigiu algo que impedia a indexação (robots, canonical, erro 5xx);
- a URL caiu do índice sem motivo aparente.

**Não use em massa.** O GSC limita solicitações por propriedade e por dia, e o
uso repetido em URLs que o Google já decidiu não indexar não muda nada.

### 4.3 Acompanhando

- **Relatório de indexação de páginas** (`Indexação → Páginas`) mostra o motivo
  de cada exclusão: *"Página duplicada sem canonical do usuário"*,
  *"Rastreada, mas não indexada"*, *"Descoberta, mas não indexada"*, etc.
- **Principais consultas / Desempenho** mostra impressões e cliques reais.
  Aparece só depois que a propriedade começa a gerar dados (alguns dias).

---

## 5. Sobre o sitemap do Google News

**Este projeto não inclui, de propósito, um sitemap do Google News.**

Motivos:

- O sitemap do Google News é voltado a **veículos jornalísticos** com produção
  contínua de notícias e política editorial formal.
- Ele tem regras próprias e mais rígidas: no máximo 1.000 URLs, apenas
  artigos dos **últimos 2 dias**, obrigatoriedade de `<news:publication_date>`
  exato, `<news:title>` curto, idioma e tags de publicação.
- Submeter um sitemap de News fora dessas regras gera erros no GSC e não traz
  benefício algum — pelo contrário, polui os relatórios.

Se um dia o Simples Oculto passar a publicar notícias diárias com equipe
editorial e quiser aparecer na aba **Notícias**, aí sim faz sentido criar um
`/news-sitemap.xml` separado (não substitui o sitemap comum) e submeter os dois.

---

## 6. Fluxo completo: do artigo publicado ao Google

```text
1. Painel → Artigos → Novo artigo → Publicar
      ↓  (o sitemap.xml é baixado automaticamente)
2. Salve o XML baixado em  sitemap.xml  na raiz do repositório
   (ou: painel → SEO e Sitemap → Exportar artigos (JSON) →
        salve em data/articles.json → npm run sitemap)
      ↓
3. Commit + push  →  deploy
      ↓
4. GSC → Inspecionar URL → colar a URL do artigo → Solicitar indexação
      ↓
5. GSC → Sitemaps → (só se necessário) reenviar  sitemap.xml
      ↓
6. Aguardar. Indexação e posição dependem exclusivamente do Google.
```

### Automação opcional (GitHub Actions)

O repositório traz `.github/workflows/sitemap.yml`, que:

- roda quando `index.html`, `data/articles.json` ou o próprio gerador mudam;
- também roda uma vez por dia e pode ser disparado manualmente
  (*Actions → Update sitemap → Run workflow*);
- regenera `sitemap.xml`, valida o XML e abre um commit se houver mudança.

---

## 7. Checklist de SEO antes de considerar "pronto"

- [ ] `robots.txt` acessível e com a linha `Sitemap:` absoluta.
- [ ] `sitemap.xml` acessível, válido, sem URLs de `/admin`.
- [ ] Nenhuma página importante com `noindex` (verificar no GSC → Inspeção).
- [ ] Canônica declarada = canônica escolhida pelo Google.
- [ ] Cada artigo com `<h1>` único, título e descrição próprios.
- [ ] Dados estruturados sem erros (GSC → Melhorias).
- [ ] `og:image` acessível publicamente (testar
      <https://developers.facebook.com/tools/debug/> se for o caso).
- [ ] Nenhum bloqueio de CSS/JS/imagens no `robots.txt` — o Google precisa
      renderizar a página (é uma SPA).
- [ ] Propriedade verificada **e** sitemap enviado no GSC.
- [ ] Sem promessa de indexação ou posição em lugar nenhum do texto do site.
