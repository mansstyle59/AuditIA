// AuditIA — contrôleur des audits complets (nouvelle interface, lot 4).
// Fait le lien entre l'écran et le moteur d'analyse (src/audit/engine.js, repris de l'ancienne interface).
// L'état de l'analyse vit dans le moteur : on peut quitter l'écran d'audit et y revenir, l'analyse continue.
// Écritures (les mêmes que l'ancienne interface, rien d'autre) : insertion d'un dossier `audits` si le client n'en a
// pas de non analysé ; puis, par le moteur, mise à jour de `clients.details` et de `audits`.
import { createAuditEngine } from '../audit/engine.js';
import { insertAudit, dataErrorMessage } from '../data/queries.js';
import { reusableAudit, newAuditRow, applyAuditResult, AUDIT_TITLE } from '../data/audits.js';
import { liveHtml, bannerHtml } from './views/audit-live.js';
import { auditsResultsHtml } from './views/audits.js';

/* ctx : getUser(), getData(), setData(data), getSupabase(), rerender(), reload(), open(auditId)
         → rerender = recomposition complète de l'écran courant ; reload = rechargement silencieux des données. */
export function createAuditController(ctx) {
  const s = { notice: null, launching: false, tick: null, filter: { q: '', state: '' } };
  let gen = 0, sb = null;   // client Supabase résolu au lancement (le moteur le lit de façon synchrone)

  const engine = createAuditEngine({
    getSupabase: () => sb,
    // Le proxy serveur vérifie la session : aucune clé n'est lue ni transmise ici.
    getClient: async () => sb || ctx.getSupabase(),
  });

  /* Rafraîchissement partiel : on ne remplace que la zone de progression et les bandeaux, pour garder
     le défilement et le focus de l'utilisateur pendant l'analyse. */
  function refreshLive() {
    const snap = engine.state();
    const live = document.getElementById('auditLive');
    if (live) live.innerHTML = liveHtml(snap, ctx.getData().clients);
    document.querySelectorAll('[data-audit-banner]').forEach(el => { el.innerHTML = snap && el.dataset.except === String(snap.auditId) ? '' : bannerHtml(snap); });
  }
  const startTicker = () => { if (!s.tick) s.tick = setInterval(refreshLive, 1000); };   // seule l'horloge « temps écoulé » change
  const stopTicker = () => { if (s.tick) { clearInterval(s.tick); s.tick = null; } };

  let lastStatus = null;
  engine.subscribe(snap => {
    const status = snap ? snap.status : null;
    if (status === 'running') startTicker(); else stopTicker();
    if (status !== lastStatus) {
      lastStatus = status;
      if (status === 'done') {
        // Enregistrement confirmé : on applique le résultat tout de suite, puis on recharge sans bloquer l'écran.
        const r = snap.result;
        ctx.setData(applyAuditResult(ctx.getData(), { auditId: snap.auditId, clientId: snap.clientId, payload: r.payload, newDetails: r.newDetails }));
        ctx.reload().then(() => ctx.rerender()).catch(() => {});
        ctx.rerender();
        return;
      }
      ctx.rerender();   // démarrage ou interruption : on recompose l'écran (progression, erreur)
      return;
    }
    refreshLive();
  });

  /* Lance l'analyse d'un dossier existant. */
  async function run(auditId) {
    const data = ctx.getData();
    const audit = data.audits.find(a => String(a.id) === String(auditId));
    if (!audit) { s.notice = { kind: 'error', text: 'Dossier d’audit introuvable.' }; ctx.rerender(); return false; }
    if (engine.isRunning()) {
      s.notice = { kind: 'warn', text: 'Une analyse est déjà en cours. Attendez sa fin avant d’en lancer une autre.' };
      ctx.rerender(); return false;
    }
    s.notice = null;
    try { sb = await ctx.getSupabase(); } catch (e) { s.notice = { kind: 'error', text: 'Connexion impossible : ' + dataErrorMessage(e) }; ctx.rerender(); return false; }
    const client = data.clients.find(c => String(c.id) === String(audit.client_id)) || null;
    ctx.open(audit.id);
    engine.start({ audit, client });   // non attendu : l'analyse continue même si l'utilisateur change d'écran
    return true;
  }

  /* Lancer un audit pour un client : reprend le dossier non analysé, sinon en crée un (comme startAuditFor). */
  async function launchForClient(clientId) {
    if (s.launching) return;
    if (engine.isRunning()) { s.notice = { kind: 'warn', text: 'Une analyse est déjà en cours. Attendez sa fin avant d’en lancer une autre.' }; ctx.rerender(); return; }
    s.launching = true; s.notice = null; ctx.rerender();
    try {
      let target = reusableAudit(ctx.getData().audits, clientId);
      if (!target) {
        target = await insertAudit(await ctx.getSupabase(), newAuditRow(ctx.getUser().id, clientId, AUDIT_TITLE));
        const d = ctx.getData();
        ctx.setData({ ...d, audits: [target, ...d.audits] });
        ctx.reload().catch(() => {});
      }
      s.launching = false;
      await run(target.id);
    } catch (e) {
      s.launching = false;
      s.notice = { kind: 'error', text: 'Création du dossier impossible : ' + dataErrorMessage(e) };
      ctx.rerender();
    }
  }

  return {
    engine, state: s,
    runningId: () => engine.runningAuditId(),
    snapshot: () => engine.state(),
    last: id => engine.last(id),
    run, launchForClient, refreshLive,
    notice: () => s.notice, clearNotice: () => { s.notice = null; },
    reset() { gen++; stopTicker(); engine.dismiss(); s.notice = null; s.launching = false; s.filter = { q: '', state: '' }; },
    /* Saisie dans la recherche des audits : seule la liste est recomposée (le champ garde le focus). */
    onInput(el) {
      if (!el.matches('[data-audit-filter]')) return false;
      s.filter.q = el.value;
      const box = document.getElementById('auditsResults');
      if (box) box.innerHTML = auditsResultsHtml(ctx.getData(), s.filter, engine.runningAuditId());
      return true;
    },
    filter: () => s.filter,
    /* Clic : renvoie true si le clic a été traité. */
    onClick(t) {
      const l = t.closest('[data-audit-launch]');
      if (l) { launchForClient(l.dataset.auditLaunch); return true; }
      const r = t.closest('[data-audit-run]');
      if (r) { run(r.dataset.auditRun); return true; }
      if (t.closest('[data-audit-ack]')) { engine.dismiss(); ctx.rerender(); return true; }
      if (t.closest('[data-audit-dismiss]')) { s.notice = null; ctx.rerender(); return true; }
      const st = t.closest('[data-audit-state]');
      if (st) { s.filter.state = s.filter.state === st.dataset.auditState ? '' : st.dataset.auditState; ctx.rerender(); return true; }
      return false;
    },
  };
}
