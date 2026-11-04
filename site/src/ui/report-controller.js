// AuditIA — contrôleur du rapport PDF (lot 5) : aperçu, téléchargement, partage, ouverture pour impression.
// Ne crée AUCUN audit et n'écrit AUCUNE donnée : il lit le dossier existant, construit le modèle et génère le PDF dans le navigateur.
// L'aperçu et le PDF viennent du même modèle (src/report/report-model.js).
import { buildReport } from '../report/report-model.js';
import { buildReportPdf } from '../report/report-pdf.js';
import { reportPreviewHtml } from '../report/report-view.js';
import { escHtml } from '../core/utils.js';

const LOCAL_JSPDF = new URL('../../vendor/jspdf.umd.min.js', import.meta.url).href;
const CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = () => { s.remove(); reject(new Error('chargement impossible')); };
    document.head.appendChild(s);
  });
}
let jsPdfPromise = null;
/* jsPDF est embarqué dans le site (vendor/) ; le CDN n'est qu'un secours. Chargé seulement à la première génération. */
export function ensureJsPdf() {
  const get = () => (window.jspdf && window.jspdf.jsPDF) || null;
  if (get()) return Promise.resolve(get());
  if (!jsPdfPromise) {
    jsPdfPromise = loadScript(LOCAL_JSPDF).catch(() => loadScript(CDN_JSPDF)).then(() => {
      if (!get()) throw new Error('bibliothèque PDF introuvable');
      return get();
    }).catch(e => { jsPdfPromise = null; throw e; });
  }
  return jsPdfPromise;
}

const fmtSize = n => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko');

/* ctx : getData(), runningId() */
export function createReportController(ctx) {
  const s = { open: false, mode: 'preview', auditId: null, model: null, busy: false, error: '', result: null, from: null, notice: '' };
  let el = null;

  const revoke = () => { if (s.result && s.result.url) { try { URL.revokeObjectURL(s.result.url); } catch (e) { /* ignoré */ } } s.result = null; };
  const model = auditId => {
    const d = ctx.getData();
    const audit = d.audits.find(a => String(a.id) === String(auditId));
    const client = audit ? d.clients.find(c => String(c.id) === String(audit.client_id)) || null : null;
    if (audit && String(ctx.runningId && ctx.runningId()) === String(audit.id)) return { ok: false, reason: 'Une analyse est en cours sur ce dossier : le rapport sera disponible à sa fin.' };
    return buildReport(audit, client, d.audits, new Date());
  };

  function actionsHtml() {
    const r = s.result;
    const canShare = r && r.file && typeof navigator !== 'undefined' && navigator.canShare && (() => { try { return navigator.canShare({ files: [r.file] }); } catch (e) { return false; } })();
    return `<button type="button" class="ds-btn ds-btn--primary" data-report-download ${s.busy ? 'disabled' : ''}>${s.busy ? 'Génération du PDF…' : r ? 'Télécharger à nouveau' : 'Télécharger le rapport PDF'}</button>
      ${canShare ? '<button type="button" class="ds-btn" data-report-share>Partager</button>' : ''}
      ${r ? `<a class="ds-btn" href="${escHtml(r.url)}" target="_blank" rel="noopener" data-report-open>Ouvrir pour imprimer</a>` : ''}
      ${s.mode === 'result' ? '<button type="button" class="ds-btn" data-report-switch>Voir l’aperçu</button>' : ''}`;
  }
  function bodyHtml() {
    const m = s.model;
    const status = s.error ? `<p class="ds-msg ds-msg--error" role="alert">${escHtml(s.error)}</p>`
      : s.busy ? '<p class="ds-msg ds-msg--warn" role="status">Génération du PDF en cours…</p>'
        : s.result ? `<p class="ds-msg ds-msg--ok" role="status" data-report-ready>Rapport prêt : ${escHtml(s.result.fileName)} · ${s.result.pages} page${s.result.pages > 1 ? 's' : ''} · ${escHtml(fmtSize(s.result.size))}. Le téléchargement a démarré ; si rien ne s’affiche, utilisez « Télécharger à nouveau » ou « Ouvrir pour imprimer ».</p>` : '';
    if (!m || !m.ok) return `<p class="ds-msg ds-msg--warn" role="alert">${escHtml((m && m.reason) || 'Rapport indisponible.')}</p>`;
    return `${status}${s.mode === 'preview' ? reportPreviewHtml(m) : `<section class="ds-card"><h3 class="ds-card__title">${escHtml(m.meta.business)}</h3><p class="ds-row__meta">${escHtml(m.meta.title)}${m.meta.auditDateLabel ? ' · audit du ' + escHtml(m.meta.auditDateLabel) : ''}</p>${s.result || s.busy || s.error ? '' : '<p class="ds-row__meta">Aucun rapport généré pour l’instant.</p>'}</section>`}`;
  }
  function render() {
    if (!el) return;
    const m = s.model;
    const title = m && m.ok ? m.meta.business : 'Rapport d’audit';
    el.innerHTML = `<div class="rp-bar"><button type="button" class="ds-btn" data-report-close>← Fermer</button><div class="rp-bar__title" id="rpTitle">Rapport · ${escHtml(title)}</div>
      <div class="rp-bar__act">${m && m.ok ? actionsHtml() : ''}</div></div>
      <div class="rp-scroll" id="rpScroll">${bodyHtml()}</div>`;
  }
  /* Rafraîchit seulement la barre d'actions et le message d'état (l'aperçu garde sa position de défilement). */
  function refreshState() {
    if (!el) return;
    const had = ['data-report-download', 'data-report-share', 'data-report-switch'].find(a => document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute(a));
    const act = el.querySelector('.rp-bar__act'); if (act && s.model && s.model.ok) act.innerHTML = actionsHtml();
    if (had) { const f = el.querySelector(`[${had}]:not([disabled])`) || el.querySelector('[data-report-close]'); if (f) f.focus(); }
    const scroll = el.querySelector('#rpScroll'); if (!scroll) return;
    scroll.querySelectorAll('.rp-status').forEach(n => n.remove());
    const tmp = document.createElement('div'); tmp.innerHTML = bodyHtml();
    const msg = tmp.firstElementChild;
    const old = scroll.querySelector(':scope > .ds-msg'); if (old) old.remove();
    if (msg && msg.classList.contains('ds-msg')) { msg.classList.add('rp-status'); scroll.prepend(msg); }
  }

  function trap(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab' || !el) return;
    const f = [...el.querySelectorAll('button:not([disabled]), a[href], summary')].filter(n => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(auditId, mode = 'preview') {
    if (s.open) close();
    s.open = true; s.mode = mode; s.auditId = auditId; s.error = ''; s.busy = false; revoke();
    s.model = model(auditId);
    s.from = document.activeElement;
    el = document.createElement('div');
    el.id = 'reportOverlay'; el.className = 'rp-overlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'rpTitle');
    document.body.appendChild(el);
    document.documentElement.classList.add('rp-lock');
    document.addEventListener('keydown', trap);
    render();
    const c = el.querySelector('[data-report-close]'); if (c) c.focus();
  }
  function close() {
    if (!s.open) return;
    s.open = false; revoke();
    document.removeEventListener('keydown', trap);
    if (el) { el.remove(); el = null; }
    document.documentElement.classList.remove('rp-lock');
    if (s.from && typeof s.from.focus === 'function' && document.contains(s.from)) s.from.focus();
    s.from = null; s.model = null; s.busy = false; s.error = '';
  }

  /* Génère le PDF depuis le dossier (relu à cet instant) et lance le téléchargement. */
  async function generate({ autoDownload = true } = {}) {
    if (s.busy) return null;
    const m = model(s.auditId);
    if (!s.model || !s.model.ok) s.model = m;
    if (!m.ok) { s.error = m.reason; refreshState(); return null; }
    s.busy = true; s.error = ''; refreshState();
    try {
      const JsPDF = await ensureJsPdf();
      const pdf = buildReportPdf(JsPDF, m);
      const blob = pdf.output('blob');
      revoke();
      let file = null; try { file = new File([blob], m.meta.fileName, { type: 'application/pdf' }); } catch (e) { file = null; }
      s.result = { url: URL.createObjectURL(blob), fileName: m.meta.fileName, size: blob.size, pages: pdf.internal.getNumberOfPages(), file };
      s.busy = false; refreshState();
      if (autoDownload) download();
      return s.result;
    } catch (e) {
      s.busy = false; s.error = 'Le PDF n’a pas pu être généré (' + ((e && e.message) || 'erreur inconnue') + '). Vos données n’ont pas été modifiées ; réessayez.'; refreshState();
      return null;
    }
  }
  function download() {
    if (!s.result) return;
    const a = document.createElement('a');
    a.href = s.result.url; a.download = s.result.fileName; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function share() {
    const r = s.result; if (!r || !r.file) return;
    try { await navigator.share({ files: [r.file], title: r.fileName }); } catch (e) { /* annulation par l'utilisateur : rien à signaler */ }
  }

  return {
    state: s, open, close, generate, isOpen: () => s.open,
    /* Clic : renvoie true si le clic a été traité. */
    onClick(t) {
      const pv = t.closest('[data-report-preview]'); if (pv) { open(pv.dataset.reportPreview, 'preview'); return true; }
      const pd = t.closest('[data-report-pdf]'); if (pd) { open(pd.dataset.reportPdf, 'result'); generate(); return true; }
      if (!s.open) return false;
      if (t.closest('[data-report-close]')) { close(); return true; }
      if (t.closest('[data-report-download]')) { if (s.result && !s.busy) download(); else generate(); return true; }
      if (t.closest('[data-report-share]')) { share(); return true; }
      if (t.closest('[data-report-switch]')) { s.mode = 'preview'; s.model = model(s.auditId); render(); const c = el && el.querySelector('[data-report-close]'); if (c) c.focus(); return true; }
      return !!t.closest('#reportOverlay');   // les autres clics dans l'aperçu (détails, liens) restent dans l'aperçu
    },
  };
}
