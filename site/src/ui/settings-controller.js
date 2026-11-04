// AuditIA — LOT 6 : contrôleur de l'écran Réglages.
// Aucun secret n'est conservé : seuls des indices masqués sont gardés en mémoire (jamais de localStorage).
import { loadSettings, saveSettings, settingsErrorMessage, loadBrand } from '../data/settings.js';
import { isAdminUser, validate, isDirty, EDITABLE_KEYS } from '../settings/settings-model.js';
import { settingsView } from './views/settings.js';

export function createSettingsController(ctx) {
  const blank = () => ({ status: 'idle', saved: null, draft: null, masks: null, exists: false, updatedAt: null, errors: {}, saving: false, notice: null, gen: 0 });
  let s = blank();

  const rerender = () => ctx.rerender();
  const snapshot = () => ({
    status: s.status, draft: s.draft, saved: s.saved, masks: s.masks, exists: s.exists, updatedAt: s.updatedAt,
    errors: s.errors, saving: s.saving, notice: s.notice, dirty: isDirty(s.draft, s.saved), canEdit: isAdminUser(ctx.getUser()),
  });

  async function load() {
    const gen = ++s.gen; const user = ctx.getUser();
    if (!user) return;
    s.status = 'loading'; s.notice = null; rerender();
    try {
      const r = await loadSettings(await ctx.getSupabase(), user.id);
      if (gen !== s.gen || !ctx.getUser()) return;
      Object.assign(s, { status: r.exists ? 'ready' : 'absent', saved: { ...r.values }, draft: { ...r.values }, masks: r.masks, exists: r.exists, updatedAt: r.updatedAt, errors: {} });
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
      Object.assign(s, { saved: { ...r.values }, draft: { ...r.values }, exists: true, status: 'ready', updatedAt: r.updatedAt, notice: { kind: 'ok', text: 'Réglages enregistrés.' } });
      if (ctx.onSaved) ctx.onSaved(await loadBrand(await ctx.getSupabase(), user.id)); // nouvelle marque (logo inclus) lue depuis les réglages enregistrés
    } catch (err) {
      if (gen !== s.gen || !ctx.getUser()) return;
      s.notice = { kind: 'error', text: settingsErrorMessage(err) };
    }
    s.saving = false; rerender();
  }

  return {
    html: () => settingsView(snapshot(), ctx.getUser()),
    load, reset: () => { s = Object.assign(blank(), { gen: s.gen + 1 }); },
    // Ouvre l'écran : charge une seule fois, un rechargement manuel reste possible
    open: () => { if (s.status === 'idle' || s.status === 'error') load(); },
    onClick(t) {
      if (t.closest('[data-settings-reload]')) { load(); return true; }
      if (t.closest('[data-settings-cancel]')) { if (s.saved) { s.draft = { ...s.saved }; s.errors = {}; s.notice = null; rerender(); } return true; }
      return false;
    },
    onInput(el) {
      const k = el.dataset && el.dataset.settingsField;
      if (!k || !EDITABLE_KEYS.includes(k) || !s.draft || !isAdminUser(ctx.getUser())) return false;
      s.draft[k] = el.value; // pas de rendu : le champ garde le focus
      const save = document.querySelector('[data-settings-save]'); const cancel = document.querySelector('[data-settings-cancel]');
      const dirty = isDirty(s.draft, s.saved);
      if (save) save.disabled = !dirty || s.saving; if (cancel) cancel.hidden = !dirty;
      return true;
    },
    onSubmit(form) { if (form.matches('[data-settings-form]')) { save(); return true; } return false; },
  };
}
