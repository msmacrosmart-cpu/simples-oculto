import { createSmartEditor, createLogin, createLocalImport } from './editor.js';

export function createPublication({ React, jsx, Layout, Logo, renderBlocks, originalArticles, categories, defaultSettings }) {
  let currentArticles = originalArticles.map(article => ({ ...article }));
  let currentSettings = defaultSettings;
  let pendingSave = false;
  const service = {
    React, jsx, Layout, Logo, renderBlocks,
    user: null,
    available: false,
    articles: () => currentArticles,
    categories: () => categories,
    settings: () => currentSettings,
    async request(path, options = {}) {
      const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: options.signal ?? AbortSignal.timeout(60000) });
      const result = await response.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
      if (!response.ok) {
        if (response.status === 401) service.user = null;
        throw new Error(result.error || 'Não foi possível concluir a operação.');
      }
      return result;
    },
    async load() {
      try {
        const session = await service.request('/api/session', { signal: AbortSignal.timeout(8000) }).catch(() => null);
        service.user = session?.user ?? null;
        const data = await service.request(`/api/content${service.user ? '?admin=1' : ''}`, { signal: AbortSignal.timeout(8000) });
        const removed = new Set(data.removedIds ?? []);
        const remoteIds = new Set(data.articles.map(article => article.id));
        currentArticles = [...originalArticles.filter(article => !removed.has(article.id) && !remoteIds.has(article.id)), ...data.articles];
        if (data.categories.length) categories.splice(0, categories.length, ...data.categories);
        currentSettings = data.settings ?? defaultSettings;
        service.available = true;
      } catch {
        service.available = false;
      }
    },
    async login(email, password) {
      await service.request('/api/session', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) });
      await service.load();
      if (!service.user) throw new Error('Sessão administrativa não confirmada. Verifique Identity e a permissão admin.');
      return { ok: true };
    },
    async logout() {
      await service.request('/api/session', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
      service.user = null;
      window.location.replace('/#/admin/login');
    },
    async save(article, confirmation = false) {
      if (!service.available || !service.user) throw new Error('Conecte o banco e entre com uma conta autorizada antes de salvar.');
      if (pendingSave) throw new Error('Aguarde o salvamento em andamento.');
      pendingSave = true;
      try {
        const { article: saved } = await service.request('/api/articles', { method: 'POST', body: JSON.stringify({ article, version: article.version ?? currentArticles.find(existing => existing.id === article.id)?.version, confirmPublish: article.status === 'publicado' && confirmation, confirmSchedule: article.status === 'agendado' && confirmation }) });
        currentArticles = [...currentArticles.filter(existing => existing.id !== saved.id), saved];
        return saved;
      } finally { pendingSave = false; }
    },
    async remove(id) {
      const article = currentArticles.find(existing => existing.id === id);
      await service.request('/api/articles', { method: 'DELETE', body: JSON.stringify({ id, version: article?.version }) });
      currentArticles = currentArticles.filter(existing => existing.id !== id);
    },
    async duplicate(id) {
      const original = currentArticles.find(article => article.id === id);
      if (!original) return null;
      let slug = `${original.slug}-copia`;
      let index = 2;
      while (currentArticles.some(article => article.slug === slug)) slug = `${original.slug}-copia-${index++}`;
      const copy = { ...original, id: crypto.randomUUID(), slug, title: `${original.title} (cópia)`, status: 'rascunho', publishedAt: new Date().toISOString().slice(0, 10) };
      delete copy.version;
      return service.save(copy);
    },
    async saveCategory(category) {
      await service.request('/api/editorial-settings', { method: 'POST', body: JSON.stringify({ action: 'category', category }) });
      const index = categories.findIndex(existing => existing.slug === category.slug);
      if (index >= 0) categories[index] = category;
      else categories.push(category);
    },
    async removeCategory(slug) {
      await service.request('/api/editorial-settings', { method: 'POST', body: JSON.stringify({ action: 'delete-category', slug }) });
      const index = categories.findIndex(category => category.slug === slug);
      if (index >= 0) categories.splice(index, 1);
    },
    async saveSettings(settings) {
      await service.request('/api/editorial-settings', { method: 'POST', body: JSON.stringify({ action: 'settings', settings }) });
      currentSettings = settings;
    },
  };
  service.Editor = createSmartEditor(service);
  service.Login = createLogin(service);
  service.Import = createLocalImport(service);
  return service;
}
