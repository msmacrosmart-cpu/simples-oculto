const splitTags = value => value.split(',').map(tag => tag.trim()).filter(Boolean);
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export function createLogin(service) {
  const { React, jsx, Logo } = service;
  const element = React.createElement;
  return function Login() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [callback] = React.useState(() => {
      const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const invitation = parameters.get('invite_token');
      const recovery = parameters.get('recovery_token');
      if (invitation || recovery) window.history.replaceState(null, '', '/#/admin/login');
      return invitation ? { action: 'invite', token: invitation } : recovery ? { action: 'recover', token: recovery } : null;
    });
    React.useEffect(() => {
      document.title = 'Login Administrativo | Simples Oculto';
      if (service.user) window.location.replace('/#/admin');
    }, []);
    async function submit(event) {
      event.preventDefault();
      if (busy) return;
      setBusy(true); setMessage('');
      try {
        if (callback) await service.request('/api/session', { method: 'POST', body: JSON.stringify({ ...callback, password }) });
        else await service.login(email, password);
        window.location.replace('/#/admin');
      } catch (error) { setMessage(error.message); }
      finally { setBusy(false); }
    }
    async function recovery() {
      if (!email || busy) return;
      setBusy(true);
      try {
        await service.request('/api/session', { method: 'POST', body: JSON.stringify({ action: 'request-recovery', email }) });
        setMessage('Se a conta existir, você receberá as instruções por e-mail.');
      } catch (error) { setMessage(error.message); }
      finally { setBusy(false); }
    }
    return element('div', { className: 'flex min-h-screen items-center justify-center bg-zinc-950 px-4' },
      element('div', { className: 'w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 so-editor' },
        element('div', { className: 'flex justify-center' }, jsx.jsx(Logo, {})),
        element('h1', { className: 'mt-6 text-center font-serif text-xl font-semibold text-white' }, callback ? 'Definir senha administrativa' : 'Painel Administrativo'),
        element('p', { className: 'mt-1 text-center text-xs text-zinc-400' }, 'Acesso restrito à equipe editorial — Netlify Identity'),
        element('form', { onSubmit: submit, className: 'so-stack' },
          !callback && element('label', null, 'E-mail', element('input', { type: 'email', required: true, autoComplete: 'username', value: email, onChange: event => setEmail(event.target.value) })),
          element('label', null, callback ? 'Nova senha' : 'Senha', element('input', { type: 'password', required: true, minLength: 8, maxLength: 200, autoComplete: callback ? 'new-password' : 'current-password', value: password, onChange: event => setPassword(event.target.value) })),
          element('button', { type: 'submit', className: 'so-primary', disabled: busy }, busy ? 'Autenticando…' : callback ? 'Confirmar senha' : 'Entrar'),
          !callback && element('button', { type: 'button', disabled: busy || !email, onClick: recovery }, 'Recuperar senha'),
          message && element('p', { role: 'alert', className: 'so-message' }, message)),
        element('p', { className: 'mt-6 text-center text-xs text-zinc-500' }, 'Uma conta confirmada com permissão admin é necessária. As credenciais de demonstração não são mais aceitas.')));
  };
}

export function createSmartEditor(service) {
  const { React, Layout, renderBlocks } = service;
  const element = React.createElement;
  return function SmartEditor() {
    const [title, setTitle] = React.useState('');
    const [text, setText] = React.useState('');
    const [instructions, setInstructions] = React.useState('');
    const [mode, setMode] = React.useState('fiel');
    const [category, setCategory] = React.useState(service.categories()[0]?.slug ?? '');
    const [tags, setTags] = React.useState('');
    const [images, setImages] = React.useState([]);
    const [cover, setCover] = React.useState('');
    const [result, setResult] = React.useState(null);
    const [busy, setBusy] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [preview, setPreview] = React.useState(false);
    const [confirmation, setConfirmation] = React.useState(false);
    const [saved, setSaved] = React.useState(null);
    React.useEffect(() => { document.title = 'Publicação Inteligente com IA | Simples Oculto'; }, []);
    React.useEffect(() => { setConfirmation(false); }, [result, images, cover, title, category, tags]);
    function invalidate() { setPreview(false); setConfirmation(false); }
    function setField(field, value) { setResult(current => ({ ...current, [field]: value })); invalidate(); }
    function setSeo(field, value) { setResult(current => ({ ...current, seo: { ...current.seo, [field]: value } })); invalidate(); }
    function updateImage(key, field, value) { setImages(current => current.map(image => image.key === key ? { ...image, [field]: value } : image)); invalidate(); }
    function changeBlock(index, field, value) {
      setResult(current => ({ ...current, content: current.content.map((block, position) => position === index ? { ...block, [field]: value } : block) })); invalidate();
    }
    function moveBlock(index, direction) {
      setResult(current => {
        const content = [...current.content]; const target = index + direction;
        if (target >= 0 && target < content.length) [content[index], content[target]] = [content[target], content[index]];
        return { ...current, content };
      }); invalidate();
    }
    async function upload(event) {
      const files = [...event.target.files]; event.target.value = '';
      if (busy || images.length + files.length > 12) { setMessage('Aguarde a operação atual. Máximo de 12 imagens por artigo.'); return; }
      if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024)) { setMessage('Envie somente JPEG, PNG ou WebP de até 4 MB cada.'); return; }
      setBusy('Enviando imagens'); setMessage('');
      try {
        for (const file of files) {
          const form = new FormData(); form.set('file', file);
          const image = await service.request('/api/media', { method: 'POST', body: form });
          setImages(current => [...current, { ...image, alt: '', caption: '', position: 0 }]);
          setCover(current => current || image.key);
        }
        invalidate(); setMessage('Imagens salvas de forma persistente. Defina capa, ALT e posição.');
      } catch (error) { setMessage(error.message); }
      finally { setBusy(''); }
    }
    async function generate() {
      if (busy) return;
      setBusy('Gerando formatação e SEO'); setMessage(''); invalidate();
      try {
        const response = await service.request('/api/generate', { method: 'POST', body: JSON.stringify({ title, text, instructions, mode, categorySlug: category, tags: splitTags(tags), images: images.map(image => ({ key: image.key, name: image.name, alt: image.alt })) }) });
        setResult(response.result);
        setImages(current => current.map(image => ({ ...image, alt: response.result.imageAlts.find(alt => alt.key === image.key)?.alt ?? image.alt })));
        setMessage(response.cached ? 'Resultado recuperado sem nova chamada à IA. Revise antes de salvar.' : 'Formatação e SEO gerados. Revise todos os campos e informações sinalizadas.');
      } catch (error) { setMessage(error.message); }
      finally { setBusy(''); }
    }
    function manual() {
      setResult({ title, slug: slugify(title), excerpt: '', content: text.split(/\n\s*\n/).filter(Boolean).map(paragraph => ({ type: 'paragraph', text: paragraph })), seo: { title, description: '', keyword: '', secondaryKeywords: [], canonical: '', socialTitle: '', socialDescription: '', internalLinks: [] }, suggestedCategorySlug: category, suggestedTags: splitTags(tags), imageAlts: [], warnings: [] });
      invalidate();
    }
    function article(status = 'rascunho') {
      if (!result) return null;
      const selectedCover = images.find(image => image.key === cover);
      const content = result.content.flatMap((block, index) => [
        ...images.filter(image => Number(image.position) === index).map(image => ({ type: 'image', src: image.url, alt: image.alt, caption: image.caption, mediaKey: image.key })), block,
      ]);
      content.push(...images.filter(image => Number(image.position) >= result.content.length).map(image => ({ type: 'image', src: image.url, alt: image.alt, caption: image.caption, mediaKey: image.key })));
      return { id: saved?.id ?? crypto.randomUUID(), version: saved?.version, slug: result.slug, title: result.title, subtitle: '', excerpt: result.excerpt, categorySlug: category, tags: splitTags(tags), authorId: 'equipe-so', coverImage: selectedCover?.url ?? 'images/hero-mystic.jpg', coverImageAlt: selectedCover?.alt ?? '', publishedAt: saved?.publishedAt ?? new Date().toISOString().slice(0, 10), status, baseViews: saved?.baseViews ?? 0, featured: false, content, sources: [], seo: result.seo, editorialWarnings: result.warnings };
    }
    async function save(status) {
      if (busy || !preview || status === 'publicado' && !confirmation) return;
      if (images.some(image => !image.alt.trim())) { setMessage('Preencha o texto alternativo de cada imagem.'); return; }
      setBusy(status === 'publicado' ? 'Publicando artigo' : 'Salvando rascunho'); setMessage('');
      try {
        const persisted = await service.save(article(status), status === 'publicado' && confirmation);
        setSaved(persisted);
        setMessage(status === 'publicado' ? 'Artigo publicado e disponível nas listagens públicas.' : 'Rascunho salvo no banco. Não está disponível ao público.');
        setConfirmation(false);
      } catch (error) { setMessage(error.message); }
      finally { setBusy(''); }
    }
    function field(label, value, onChange, options = {}) {
      const { multiline, ...attributes } = options;
      return element('label', { className: 'so-field' }, label, element(multiline ? 'textarea' : 'input', { value: value ?? '', onChange: event => onChange(event.target.value), disabled: Boolean(busy), ...attributes }));
    }
    const previewArticle = result ? article() : null;
    return element(Layout, null, element('div', { className: 'so-editor' },
      element('h1', { className: 'font-serif text-2xl font-bold text-white' }, 'Publicação Inteligente com IA'),
      element('p', { className: 'text-sm text-zinc-500' }, 'Cole seu artigo, organize as imagens e revise tudo antes de publicar. O editor manual continua disponível.'),
      !service.available && element('p', { role: 'alert', className: 'so-message' }, 'Banco indisponível. Não é possível salvar ou publicar.'),
      element('div', { className: 'so-grid' },
        element('section', { className: 'so-panel so-stack' },
          element('h2', null, 'Conteúdo original'),
          field('Título', title, setTitle, { maxLength: 300 }),
          field('Texto completo do artigo', text, setText, { multiline: true, rows: 14, maxLength: 35000 }),
          field('Instruções opcionais', instructions, setInstructions, { multiline: true, rows: 3, maxLength: 2000 }),
          element('label', null, 'Modo de processamento', element('select', { value: mode, disabled: Boolean(busy), onChange: event => setMode(event.target.value) }, element('option', { value: 'fiel' }, 'Formatação fiel — preserva o texto'), element('option', { value: 'editorial' }, 'Revisão editorial — gramática, clareza e SEO'))),
          element('p', { className: 'so-help' }, mode === 'fiel' ? 'O servidor rejeita resultados que removam, acrescentem ou reordenem palavras do original.' : 'A revisão não verifica fatos externamente. Confira as informações e os avisos da IA.'),
          element('div', { className: 'so-actions' }, element('button', { onClick: generate, className: 'so-primary', disabled: Boolean(busy) || !title.trim() || text.trim().length < 30 }, 'Gerar formatação e SEO'), element('button', { onClick: manual, disabled: Boolean(busy) || !title.trim() || !text.trim() }, 'Organizar manualmente'))),
        element('aside', { className: 'so-panel so-stack' },
          element('h2', null, 'Categoria, tags e imagens'),
          element('label', null, 'Categoria existente', element('select', { value: category, disabled: Boolean(busy), onChange: event => { setCategory(event.target.value); invalidate(); } }, ...service.categories().map(item => element('option', { key: item.slug, value: item.slug }, item.shortName)))),
          field('Tags (separadas por vírgulas)', tags, value => { setTags(value); invalidate(); }),
          element('label', null, 'Enviar imagens', element('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, disabled: Boolean(busy), onChange: upload })),
          element('p', { className: 'so-help' }, 'Até 12 imagens; JPEG, PNG ou WebP de até 4 MB cada. Armazenamento persistente, sem URLs temporárias.'),
          ...images.map((image, index) => element('div', { className: 'so-image-card so-stack', key: image.key },
            element('img', { src: image.url, alt: image.alt, className: 'so-thumbnail' }),
            element('label', { className: 'so-inline' }, element('input', { type: 'radio', name: 'cover', checked: cover === image.key, disabled: Boolean(busy), onChange: () => { setCover(image.key); invalidate(); } }), 'Usar como capa'),
            field(`Texto alternativo — ${image.name}`, image.alt, value => updateImage(image.key, 'alt', value)),
            field('Legenda', image.caption, value => updateImage(image.key, 'caption', value)),
            field('Posição: antes do bloco (0 = início)', image.position, value => updateImage(image.key, 'position', Math.max(0, Number(value) || 0)), { type: 'number', min: 0, max: result?.content.length ?? 400 }),
            element('div', { className: 'so-actions' },
              element('button', { disabled: Boolean(busy) || index === 0, onClick: () => { const ordered = [...images]; [ordered[index], ordered[index - 1]] = [ordered[index - 1], ordered[index]]; setImages(ordered); invalidate(); } }, 'Subir imagem'),
              element('button', { disabled: Boolean(busy) || index === images.length - 1, onClick: () => { const ordered = [...images]; [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]]; setImages(ordered); invalidate(); } }, 'Descer imagem'),
              element('button', { disabled: Boolean(busy), onClick: () => { setImages(current => current.filter(item => item.key !== image.key)); if (cover === image.key) setCover(images.find(item => item.key !== image.key)?.key ?? ''); invalidate(); } }, 'Remover do artigo')))))),
      busy && element('p', { role: 'status', className: 'so-message', 'aria-live': 'polite' }, `${busy}…`),
      message && element('p', { role: 'status', className: 'so-message', 'aria-live': 'polite' }, message),
      result && element('section', { className: 'so-panel so-stack' },
        element('h2', null, 'Resultado editável'),
        result.warnings.length > 0 && element('div', { role: 'note', className: 'so-warnings' }, element('strong', null, 'Revisão necessária'), element('ul', null, ...result.warnings.map((warning, index) => element('li', { key: index }, warning)))),
        element('div', { className: 'so-actions' }, element('button', { disabled: Boolean(busy), onClick: () => { setCategory(result.suggestedCategorySlug); setTags(result.suggestedTags.join(', ')); invalidate(); } }, 'Aplicar categoria e tags sugeridas'), element('span', { className: 'so-help' }, `${result.suggestedCategorySlug}: ${result.suggestedTags.join(', ')}`)),
        element('div', { className: 'so-grid' },
          element('div', { className: 'so-stack' }, field('Título final', result.title, value => setField('title', value)), field('Slug', result.slug, value => setField('slug', value)), field('Resumo / excerpt', result.excerpt, value => setField('excerpt', value), { multiline: true, rows: 3 })),
          element('div', { className: 'so-stack' }, field('Título SEO', result.seo.title, value => setSeo('title', value)), field('Meta description', result.seo.description, value => setSeo('description', value), { multiline: true, rows: 3 }), field('Palavra-chave principal', result.seo.keyword, value => setSeo('keyword', value)), field('Palavras-chave secundárias', result.seo.secondaryKeywords.join(', '), value => setSeo('secondaryKeywords', splitTags(value))), field('Título para compartilhamento social', result.seo.socialTitle, value => setSeo('socialTitle', value)), field('Descrição para compartilhamento social', result.seo.socialDescription, value => setSeo('socialDescription', value), { multiline: true, rows: 2 }))),
        element('h3', null, 'Blocos do artigo'),
        ...result.content.map((block, index) => element('div', { className: 'so-block so-stack', key: index },
          element('div', { className: 'so-actions' }, element('strong', null, `Bloco ${index}: ${block.type}`), element('button', { disabled: Boolean(busy) || index === 0, onClick: () => moveBlock(index, -1) }, 'Subir'), element('button', { disabled: Boolean(busy) || index === result.content.length - 1, onClick: () => moveBlock(index, 1) }, 'Descer'), element('button', { disabled: Boolean(busy), onClick: () => { setField('content', result.content.filter((item, position) => position !== index)); } }, 'Remover')),
          field(block.type === 'list' ? 'Itens (um por linha)' : 'Texto', block.type === 'list' ? block.items.join('\n') : block.text, value => changeBlock(index, block.type === 'list' ? 'items' : 'text', block.type === 'list' ? value.split('\n') : value), { multiline: true, rows: block.type === 'heading' ? 2 : 4 }),
          block.type === 'heading' && element('label', null, 'Nível do subtítulo', element('select', { value: block.level, onChange: event => changeBlock(index, 'level', Number(event.target.value)), disabled: Boolean(busy) }, element('option', { value: 2 }, 'H2'), element('option', { value: 3 }, 'H3'))),
          block.type === 'quote' && field('Atribuição da citação', block.cite, value => changeBlock(index, 'cite', value)),
          block.type === 'list' && element('label', { className: 'so-inline' }, element('input', { type: 'checkbox', checked: block.ordered, disabled: Boolean(busy), onChange: event => changeBlock(index, 'ordered', event.target.checked) }), 'Lista numerada'))),
        element('div', { className: 'so-actions' }, ...['paragraph', 'heading', 'list', 'quote'].map(type => element('button', { key: type, disabled: Boolean(busy), onClick: () => setField('content', [...result.content, type === 'heading' ? { type, text: '', level: 2, id: '' } : type === 'list' ? { type, items: [''], ordered: false } : type === 'quote' ? { type, text: '', cite: '' } : { type, text: '' }]) }, `Adicionar ${type}`))),
        element('h3', null, 'Links internos sugeridos'),
        result.seo.internalLinks.length ? element('ul', { className: 'so-stack' }, ...result.seo.internalLinks.map(link => element('li', { key: link.slug }, element('a', { href: `/#/artigo/${link.slug}`, target: '_blank', rel: 'noopener noreferrer' }, link.title), element('p', { className: 'so-help' }, link.reason), element('button', { disabled: Boolean(busy), onClick: () => setSeo('internalLinks', result.seo.internalLinks.filter(item => item.slug !== link.slug)) }, 'Remover link')))) : element('p', { className: 'so-help' }, 'Nenhum link sugerido. Não são criadas páginas inexistentes.'),
        element('button', { onClick: () => setPreview(true), disabled: Boolean(busy), className: 'so-primary' }, 'Pré-visualizar artigo final')),
      result && preview && element('section', { className: 'so-panel so-stack' },
        element('h2', null, 'Prévia final — ainda não publicado'),
        element('article', { className: 'so-preview' }, element('h1', { className: 'font-serif text-2xl font-bold text-white' }, previewArticle.title), element('p', { className: 'text-zinc-400' }, previewArticle.excerpt), element('img', { src: previewArticle.coverImage, alt: previewArticle.coverImageAlt, className: 'so-preview-cover' }), element(renderBlocks, { blocks: previewArticle.content }), previewArticle.seo.internalLinks.length > 0 && element('nav', { className: 'so-internal-links', 'aria-label': 'Leituras relacionadas' }, element('h2', null, 'Continue lendo'), ...previewArticle.seo.internalLinks.map(link => element('a', { href: `/#/artigo/${link.slug}`, key: link.slug }, link.title)))),
        element('label', { className: 'so-inline' }, element('input', { type: 'checkbox', checked: confirmation, disabled: Boolean(busy), onChange: event => setConfirmation(event.target.checked) }), 'Revisei a prévia e confirmo a publicação pública deste artigo.'),
        element('div', { className: 'so-actions' }, element('button', { disabled: Boolean(busy), onClick: () => save('rascunho') }, 'Salvar como rascunho'), element('button', { disabled: Boolean(busy) || !confirmation, className: 'so-primary', onClick: () => save('publicado') }, 'Publicar agora'))),
      saved && element('div', { className: 'so-actions' }, element('a', { href: `/#/admin/artigos/${saved.id}/editar` }, 'Abrir no editor manual'), saved.status === 'publicado' && element('a', { href: `/#/artigo/${saved.slug}` }, 'Ver artigo público')),
      element('div', { className: 'so-actions' }, element('button', { disabled: Boolean(busy), onClick: () => { if (window.confirm('Cancelar sem publicar? Alterações não salvas serão descartadas; imagens já enviadas permanecerão privadas no armazenamento.')) window.location.assign('/#/admin'); } }, 'Cancelar sem publicar'), element('a', { href: '/#/admin/artigos/novo' }, 'Usar o editor manual existente'))));
  };
}

export function createLocalImport(service) {
  const { React, Layout } = service;
  const element = React.createElement;
  return function LocalImport() {
    const [snapshot] = React.useState(() => {
      function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
      return { articles: Object.values(read('simples-oculto:articles-overrides', {})), categories: Object.values(read('simples-oculto:categories-overrides', {})), settings: read('simples-oculto:settings', null), deleted: read('simples-oculto:articles-deleted', []) };
    });
    const [confirmed, setConfirmed] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [message, setMessage] = React.useState('');
    async function importDrafts() {
      if (!confirmed || busy) return;
      setBusy(true);
      let imported = 0;
      try {
        for (const category of snapshot.categories) await service.saveCategory(category);
        for (const original of snapshot.articles) {
          let slug = `${original.slug || slugify(original.title)}-importado`;
          let index = 2;
          while (service.articles().some(article => article.slug === slug)) slug = `${original.slug || slugify(original.title)}-importado-${index++}`;
          const draft = { ...original, id: crypto.randomUUID(), slug, status: 'rascunho' };
          delete draft.version;
          await service.save(draft); imported++;
        }
        setMessage(`${imported} artigos importados como novos rascunhos. Nenhum conteúdo público foi substituído e os dados locais foram preservados.`);
        setConfirmed(false);
      } catch (error) { setMessage(`${imported} rascunhos importados antes da falha: ${error.message}. Os dados locais não foram apagados.`); }
      finally { setBusy(false); }
    }
    return element(Layout, null, element('section', { className: 'so-editor so-panel so-stack' }, element('h1', { className: 'font-serif text-2xl font-bold text-white' }, 'Importar dados deste navegador'), element('p', null, 'O painel anterior guardava alterações apenas neste navegador. Revise a importação antes de transferi-las ao banco real.'), element('p', null, `${snapshot.articles.length} artigos locais; ${snapshot.categories.length} categorias locais.`), element('ul', { className: 'so-stack' }, ...snapshot.articles.map((article, index) => element('li', { key: index }, `${article.title} — ${article.status}`))), element('p', { className: 'so-help' }, `${snapshot.deleted.length} exclusões locais não serão aplicadas ao site. Configurações locais não serão sobrescritas automaticamente. Imagens base64 ou blob precisam ser reenviadas no editor inteligente. Nenhuma sessão ou credencial local é importada.`), element('label', { className: 'so-inline' }, element('input', { type: 'checkbox', checked: confirmed, disabled: busy, onChange: event => setConfirmed(event.target.checked) }), 'Confirmo importar as categorias e criar rascunhos separados, sem publicar ou substituir artigos existentes.'), element('button', { className: 'so-primary', disabled: busy || !confirmed, onClick: importDrafts }, busy ? 'Importando…' : 'Importar como rascunhos'), message && element('p', { role: 'status', className: 'so-message' }, message)));
  };
}
