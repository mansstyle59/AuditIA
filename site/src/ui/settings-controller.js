// AuditIA — contrôle de l'écran Réglages : marque + intégrations API.
import { loadSettings, saveSettings, saveApiSettings, settingsErrorMessage, loadBrand } from '../data/settings.js';
import { isAdminUser, validate, isDirty, EDITABLE_KEYS, API_SERVICES, API_META_KEYS } from '../settings/settings-model.js';
import { settingsView } from './views/settings.js';

export function createSettingsController(ctx) {
  const blank = () => ({
    status: 'idle', saved: null, draft: null, exists: false, updatedAt: null,
    errors: {}, saving: false, notice: null, gen: 0,
    apiStatus: {}, apiOther: {}, apiSavedOther: {}, apiDraft: {}, apiClear: {},
    apiSaving: false, apiDirty: false, apiNotice: null, apiError: '',
  });
  let s = blank();

  const rerender = () => ctx.rerender();
  const snapshot = () => ({
    status: s.status, draft: s.draft, saved: s.saved, exists: s.exists, updatedAt: s.updatedAt,
    errors: s.errors, saving: s.saving, notice: s.notice, dirty: isDirty(s.draft, s.saved),
    canEdit: isAdminUser(ctx.getUser()),
    apiStatus: s.apiStatus, apiOther: s.apiOther, apiDraft: s.apiDraft,
    apiSaving: s.apiSaving, apiDirty: s.apiDirty, apiNotice: s.apiNotice, apiError: s.apiError,
  });

  async function load() {
    const gen = ++s.gen; const user = ctx.getUser();
    if (!user) return;
    s.status = 'loading'; s.notice = null; rerender();
    try {
      const r = await loadSettings(await ctx.getSupabase(), user.id);
      if (gen !== s.gen || !ctx.getUser()) return;
      const api = r.api || {};
      const other = Object.fromEntries(API_META_KEYS.map(k => [k, String((api.other && api.other[k]) || '')]));
      Object.assign(s, {
        status: r.exists ? 'ready' : 'absent',
        saved: { ...r.values }, draft: { ...r.values }, exists: r.exists,
        updatedAt: r.updatedAt, errors: {},
        apiStatus: api.keys || {}, apiOther: other, apiSavedOther: { ...other },
        apiDraft: {}, apiClear: {}, apiDirty: false, apiNotice: null, apiError: api.error || '',
      });
    } catch (err) {
      if (gen !== s.gen || !ctx.getUser()) return;
      Object.assign(s, { status: 'error', notice: { kind: 'error', text: settingsErrorMessage(err) } });
    }
    rerender();
  }

  async function save() {
    const user = ctx.getUser();
    if (s.saving || !user) return;
    if (!isAdminUser(user)) { s.notice = { kind: 'error', text: settingsErrorMessage({ code: 'FORBIDDEN' }) }; rerender(); return; }
    const v = validate(s.draft);
    if (!v.ok) { s.errors = v.errors; s.notice = { kind: 'error', text: settingsErrorMessage({ code: 'INVALID' }) }; rerender(); return; }
    s.saving = true; s.errors = {}; s.notice = null; rerender();
    const gen = s.gen;
    try {
      const r = await saveSettings(await ctx.getSupabase(), user, s.draft);
      if (gen !== s.gen || !ctx.getUser()) return;
      Object.assign(s, { saved: { ...r.values }, draft: { ...r.values }, exists: true, status: 'ready', updatedAt: r.updatedAt, notice: { kind: 'ok', text: 'Réglages de marque enregistrés.' } });
      if (ctx.onSaved) ctx.onSaved(await loadBrand(await ctx.getSupabase(), user.id));
    } catch (err) {
      if (gen !== s.gen || !ctx.getUser()) return;
      s.notice = { kind: 'error', text: settingsErrorMessage(err) };
    }
    s.saving = false; rerender();
  }

  async function saveApis() {
    const user = ctx.getUser();
    if (s.apiSaving || !user) return;
    if (!isAdminUser(user)) { s.apiNotice = { kind: 'error', text: settingsErrorMessage({ code: 'FORBIDDEN' }) }; rerender(); return; }

    const values = { ...s.apiOther };
    for (const svc of API_SERVICES) {
      const key = svc.column;
      if (s.apiClear[key]) values[key] = '';
      else if (typeof s.apiDraft[key] === 'string' && s.apiDraft[key].trim()) values[key] = s.apiDraft[key].trim();
    }
    s.apiSaving = true; s.apiNotice = null; rerender();
    const gen = s.gen;
    try {
      const response = await saveApiSettings(await ctx.getSupabase(), user, values);
      if (gen !== s.gen || !ctx.getUser()) return;
      s.apiStatus = response.keys || {};
      s.apiOther = Object.fromEntries(API_META_KEYS.map(k => [k, String((response.other && response.other[k]) || '')]));
      s.apiSavedOther = { ...s.apiOther };
      s.apiDraft = {}; s.apiClear = {}; s.apiDirty = false; s.apiError = '';
      s.apiNotice = { kind: 'ok', text: 'Intégrations enregistrées côté serveur. Les valeurs secrètes restent masquées.' };
    } catch (err) {
      if (gen !== s.gen || !ctx.getUser()) return;
      s.apiNotice = { kind: 'error', text: settingsErrorMessage(err) };
    }
    s.apiSaving = false; rerender();
  }

  function updateApiSaveState() {
    const button = document.querySelector('[data-api-save]');
    if (button) button.disabled = !s.apiDirty || s.apiSaving;
  }

  return {
    html: () => settingsView(snapshot(), ctx.getUser()),
    load,
    reset: () => { s = Object.assign(blank(), { gen: s.gen + 1 }); },
    open: () => { if (s.status === 'idle' || s.status === 'error') load(); },
    onClick(t) {
      if (t.closest('[data-settings-reload]')) { load(); return true; }
      if (t.closest('[data-settings-cancel]')) {
        if (s.saved) { s.draft = { ...s.saved }; s.errors = {}; s.notice = null; rerender(); }
        return true;
      }
      const reveal = t.closest('[data-api-reveal]');
      if (reveal) {
        const input = document.getElementById('api_' + reveal.dataset.apiReveal);
        if (input) {
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          reveal.textContent = show ? 'Masquer' : 'Afficher';
          reveal.setAttribute('aria-pressed', String(show));
        }
        return true;
      }
      const clear = t.closest('[data-api-clear]');
      if (clear) {
        const key = clear.dataset.apiClear;
        s.apiClear[key] = true; s.apiDraft[key] = ''; s.apiDirty = true;
        const input = document.getElementById('api_' + key);
        if (input) input.value = '';
        clear.textContent = 'Suppression prévue';
        clear.disabled = true;
        updateApiSaveState();
        return true;
      }
      return false;
    },
    onInput(el) {
      const key = el.dataset && el.dataset.settingsField;
      if (key && EDITABLE_KEYS.includes(key) && s.draft && isAdminUser(ctx.getUser())) {
        s.draft[key] = el.value;
        const saveBtn = document.querySelector('[data-settings-save]');
        const cancelBtn = document.querySelector('[data-settings-cancel]');
        const dirty = isDirty(s.draft, s.saved);
        if (saveBtn) saveBtn.disabled = !dirty || s.saving;
        if (cancelBtn) cancelBtn.hidden = !dirty;
        return true;
      }
      const apiKey = el.dataset && el.dataset.apiField;
      if (apiKey && isAdminUser(ctx.getUser())) {
        if (API_SERVICES.some(x => x.column === apiKey)) s.apiDraft[apiKey] = el.value;
        else if (API_META_KEYS.includes(apiKey)) s.apiOther[apiKey] = el.value;
        else return false;
        s.apiClear[apiKey] = false;
        s.apiDirty = true;
        updateApiSaveState();
        return true;
      }
      return false;
    },
    onSubmit(form) {
      if (form.matches('[data-settings-form]')) { save(); return true; }
      if (form.matches('[data-api-settings-form]')) { saveApis(); return true; }
      return false;
    },
  };
}
