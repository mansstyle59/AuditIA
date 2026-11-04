// AuditIA — contrôleur de la section « Prospects » (lot 3) : état, appels Google Places, ajout au portefeuille.
// Aucune écriture hors de l'ajout d'un commerce (table clients). Les résultats périmés sont ignorés.
import { PlacesError, searchText, searchNearby, autocomplete, placeDetails, getBrowserPosition } from '../api/places.js';
import { parseTarget, applyFilters, findDuplicate, clientRowFromPlace, clientRowFromForm } from '../data/places-search.js';
import { loadPlacesKey, insertClient, dataErrorMessage } from '../data/queries.js';
import { prospectsView, outHtml, noticeHtml } from './views/prospects.js';

const fresh = () => ({
  tab: 'nl', key: { status: 'idle', error: '' }, notice: null, adding: false, last: null,
  nl: { q: '', status: 'idle', rows: [], parsed: null, raw: 0, removed: 0, error: '', errKind: '' },
  nearby: { status: 'idle', rows: [], raw: 0, error: '', errKind: '', city: '', mode: 'gps', msg: '' },
  manual: { q: '', status: 'idle', suggestions: [], error: '', picked: null, pickStatus: 'idle', pickError: '' },
});

const kindOf = e => (e instanceof PlacesError ? e.kind : 'network');
const msgOf = e => (e instanceof PlacesError ? e.message : 'Une erreur est survenue. Réessayez.');

// ctx : { getUser(), getClients(), getSupabase(), reload() → { clients }, rerender() }
export function createSearchController(ctx) {
  let s = fresh();
  let gen = 0;          // change à chaque réinitialisation : une réponse tardive est ignorée
  let acSeq = 0;
  let acTimer = null;
  let placesKey = '';   // gardée en mémoire seulement ; jamais affichée

  const live = g => g === gen && !!ctx.getUser();
  const clients = () => ctx.getClients();

  function refresh() {
    const out = document.getElementById('psOut');
    const note = document.getElementById('psNotice');
    if (note) note.innerHTML = noticeHtml(s.notice);
    if (out) out.innerHTML = outHtml(s, clients());
  }

  async function ensureKey() {
    if (['ready', 'missing', 'loading', 'error'].includes(s.key.status)) return;
    const g = gen;
    s.key = { status: 'loading', error: '' };
    try {
      const sb = await ctx.getSupabase();
      const k = await loadPlacesKey(sb, ctx.getUser().id);
      if (!live(g)) return;
      placesKey = k;
      s.key = { status: k ? 'ready' : 'missing', error: '' };
    } catch (e) {
      if (!live(g)) return;
      s.key = { status: 'error', error: dataErrorMessage(e) };
    }
    ctx.rerender();
  }

  // ----- recherche en langage naturel -----
  async function runNl(q) {
    const text = String(q || '').trim();
    if (!text) return;
    s.nl.q = text; s.last = { type: 'nl', arg: text }; s.notice = null;
    if (!placesKey) { s.nl = { ...s.nl, status: 'error', errKind: 'config', error: '' }; ctx.rerender(); return; }
    const g = gen, parsed = parseTarget(text);
    s.nl = { ...s.nl, status: 'loading', rows: [], parsed, error: '', errKind: '' };
    ctx.rerender();
    try {
      const raw = await searchText(placesKey, parsed);
      if (!live(g)) return;
      const f = applyFilters(raw, parsed);
      s.nl = { ...s.nl, status: 'done', rows: f.rows, raw: raw.length, removed: f.removed, parsed };
    } catch (e) {
      if (!live(g)) return;
      s.nl = { ...s.nl, status: 'error', errKind: kindOf(e), error: msgOf(e) };
    }
    ctx.rerender();
  }

  // ----- commerces proches -----
  async function runNearby() {
    if (s.nearby.status === 'loading') return;
    s.last = { type: 'nearby' }; s.notice = null;
    if (!placesKey) { s.nearby = { ...s.nearby, status: 'error', errKind: 'config' }; ctx.rerender(); return; }
    const g = gen;
    s.nearby = { ...s.nearby, status: 'loading', rows: [], error: '', errKind: '', mode: 'gps', msg: 'Autorisez la localisation si le navigateur vous le demande…' };
    ctx.rerender();
    let pos;
    try { pos = await getBrowserPosition(); }
    catch (e) {
      if (!live(g)) return;
      // Position refusée ou indisponible : repli sur la recherche par ville
      s.nearby = { ...s.nearby, status: 'denied', error: msgOf(e), errKind: 'geo' };
      ctx.rerender(); return;
    }
    if (!live(g)) return;
    s.nearby.msg = 'Recherche des établissements proches…'; ctx.rerender();
    try {
      const rows = await searchNearby(placesKey, pos);
      if (!live(g)) return;
      s.nearby = { ...s.nearby, status: 'done', rows, raw: rows.length, mode: 'gps' };
    } catch (e) {
      if (!live(g)) return;
      s.nearby = { ...s.nearby, status: 'error', errKind: kindOf(e), error: msgOf(e) };
    }
    ctx.rerender();
  }

  async function runCity(city) {
    const c = String(city || '').trim();
    s.nearby.city = c;
    if (!c) return;
    s.last = { type: 'city', arg: c }; s.notice = null;
    const g = gen;
    s.nearby = { ...s.nearby, status: 'loading', rows: [], error: '', errKind: '', mode: 'city', msg: 'Recherche des commerces de ' + c + '…' };
    ctx.rerender();
    try {
      const rows = await searchText(placesKey, parseTarget('commerces ' + c));
      if (!live(g)) return;
      s.nearby = { ...s.nearby, status: 'done', rows, raw: rows.length, mode: 'city' };
    } catch (e) {
      if (!live(g)) return;
      s.nearby = { ...s.nearby, status: 'error', errKind: kindOf(e), error: msgOf(e) };
    }
    ctx.rerender();
  }

  // ----- ajout manuel : auto-complétion et fiche -----
  function onAcInput(value) {
    s.manual.q = value;
    clearTimeout(acTimer);
    const text = value.trim();
    if (text.length < 2) { acSeq++; s.manual.status = 'idle'; s.manual.suggestions = []; refresh(); return; }
    if (!placesKey) return;
    acTimer = setTimeout(async () => {
      const seq = ++acSeq, g = gen;
      s.manual.status = 'loading'; refresh();
      try {
        const list = await autocomplete(placesKey, text);
        if (seq !== acSeq || !live(g)) return;
        s.manual = { ...s.manual, status: 'done', suggestions: list, error: '' };
      } catch (e) {
        if (seq !== acSeq || !live(g)) return;
        s.manual = { ...s.manual, status: 'error', suggestions: [], error: msgOf(e) };
      }
      refresh();
    }, 350);
  }

  async function pick(placeId) {
    if (!placeId || !placesKey) return;
    const g = gen;
    s.manual = { ...s.manual, pickStatus: 'loading', pickError: '', suggestions: [] };
    refresh();
    try {
      const p = await placeDetails(placesKey, placeId);
      if (!live(g)) return;
      s.manual = { ...s.manual, pickStatus: 'idle', picked: p, status: 'idle' };
      ctx.rerender();
    } catch (e) {
      if (!live(g)) return;
      s.manual = { ...s.manual, pickStatus: 'error', pickError: msgOf(e) };
      refresh();
    }
  }

  // ----- ajout au portefeuille (avec contrôle des doublons) -----
  async function add(row, key) {
    if (s.adding) return;
    if (!row.name) { s.notice = { kind: 'error', text: 'Le nom du commerce est obligatoire.' }; refresh(); return; }
    const g = gen, uid = ctx.getUser().id;
    s.adding = true; s.notice = null; refresh();
    try {
      let current;
      try { current = await ctx.reload(); }
      catch (e) { throw new Error('Vérification des doublons impossible, ajout annulé. ' + dataErrorMessage(e)); }
      if (!live(g)) return;
      const dup = findDuplicate(current.clients, { placeId: row.details && row.details.place_id, name: row.name, city: row.city });
      if (dup) {
        s.notice = { kind: 'dup', text: '« ' + dup.client.name + ' » est déjà dans votre portefeuille : rien n’a été ajouté.', clientId: dup.client.id };
      } else {
        const sb = await ctx.getSupabase();
        const created = await insertClient(sb, { ...row, user_id: uid });
        if (!live(g)) return;
        try { await ctx.reload(); } catch (e) { /* la liste se rafraîchira au prochain chargement */ }
        s.notice = { kind: 'ok', text: '« ' + row.name + ' » a été ajouté à votre portefeuille.', clientId: created && created.id };
        if (s.tab === 'manual') s.manual = { ...s.manual, picked: null, q: '', suggestions: [], status: 'idle' };
      }
    } catch (e) {
      if (!live(g)) return;
      s.notice = { kind: 'error', text: /annulé/.test(e.message) ? e.message : 'Ajout impossible : ' + dataErrorMessage(e) };
    }
    s.adding = false;
    refresh();
    const n = document.getElementById('psNotice');
    if (n && s.notice) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function rowsFor(src) { return src === 'nearby' ? s.nearby.rows : s.nl.rows; }

  return {
    reset() { gen++; acSeq++; clearTimeout(acTimer); placesKey = ''; s = fresh(); },
    html() { return prospectsView(s, clients()); },
    // appelé après chaque rendu de la section
    mounted() { ensureKey(); },
    onClick(t) {
      const tab = t.closest('[data-ps-tab]');
      if (tab) { s.tab = tab.dataset.psTab; s.notice = null; ctx.rerender(); return true; }
      const ex = t.closest('[data-ps-example]');
      if (ex) { runNl(ex.dataset.psExample); return true; }
      if (t.closest('[data-ps-nearby]')) { runNearby(); return true; }
      if (t.closest('[data-ps-keyretry]')) { s.key = { status: 'idle', error: '' }; ctx.rerender(); return true; }
      if (t.closest('[data-ps-retry]')) {
        const l = s.last || { type: s.tab };
        if (l.type === 'city') runCity(l.arg); else if (l.type === 'nearby') runNearby(); else runNl(l.arg || s.nl.q);
        return true;
      }
      const pk = t.closest('[data-ps-pick]');
      if (pk) { pick(pk.dataset.psPick); return true; }
      if (t.closest('[data-ps-manual]')) { s.manual = { ...s.manual, picked: { placeId: '', name: '', city: '', category: 'Autre', website: '' } }; s.notice = null; ctx.rerender(); return true; }
      if (t.closest('[data-ps-cancel]')) { s.manual = { ...s.manual, picked: null }; ctx.rerender(); return true; }
      const ad = t.closest('[data-ps-add]');
      if (ad) {
        const src = ad.dataset.psSrc, p = rowsFor(src)[Number(ad.dataset.psAdd)];
        if (p) add(clientRowFromPlace(p, ctx.getUser().id, {}, src === 'nearby' ? 'Google Places — commerces à proximité' : 'Google Places — recherche'), p.placeId);
        return true;
      }
      return false;
    },
    onSubmit(form) {
      if (form.id === 'psNlForm') { runNl(form.elements.query.value); return true; }
      if (form.id === 'psCityForm') { runCity(form.elements.city.value); return true; }
      if (form.id === 'psAddForm') {
        const f = form.elements, p = s.manual.picked || {};
        const over = { name: f.name.value, city: f.city.value, category: f.category.value, website: f.website.value };
        add(p.placeId ? clientRowFromPlace(p, ctx.getUser().id, over, 'Google Places') : clientRowFromForm(over, ctx.getUser().id));
        return true;
      }
      return false;
    },
    onInput(el) {
      if (el.matches('[data-ps-nlq]')) { s.nl.q = el.value; return true; }
      if (el.matches('[data-ps-ac]')) { onAcInput(el.value); return true; }
      return false;
    },
  };
}
