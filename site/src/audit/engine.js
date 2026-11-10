/* AuditIA — moteur de l'analyse complète (orchestration), repris de runFullAudit (site/index.html).
   Règles identiques à l'ancienne interface :
   - 10 sources lancées en parallèle, chacune avec son délai maximum (20 s, 35 s, 15 s, 15 s, 12 s, 20 s, 25 s, 60 s, 45 s, 20 s) ;
   - une source muette ou en échec n'arrête pas l'audit : elle est marquée « limitée » et ajoutée à la liste des limites ;
   - un seul audit à la fois ;
   - écritures identiques : mise à jour de clients.details (si de nouvelles données ont été reçues) puis de audits (score, statut, site, scan).
   Différences voulues (pas de logique d'audit modifiée) :
   - l'état de l'analyse est publié sous forme d'événements réels (une source terminée = une ligne qui change) ;
     la progression est la part réelle de sources terminées, sans animation simulée ;
   - l'état vit dans le moteur (module), pas dans l'écran : on peut quitter l'écran d'audit et y revenir. */
import { safeHttpUrl, siteHost } from '../core/utils.js';
import { analyzeSite, geoFromHtml } from './site-analysis.js';
import { visibilityAudit } from './scoring.js';
import { readSiteHtml, fetchSirene, fetchDomainDate, fetchScreenshot, fetchGeoFiles } from '../api/web-read.js';
import { createAuditSources } from '../api/audit-sources.js';

/* Les 10 sources, dans l'ordre de l'ancien moteur. `needsWeb` : source possible seulement si le commerce a un site. */
export const AUDIT_SOURCES = [
  { id: 'site',     label: 'Analyse du site',                     group: 'site',     needsWeb: true,  ms: 20000, issue: 'lecture du site impossible' },
  { id: 'presence', label: 'Recherche web et annuaires',          group: 'presence', needsWeb: false, ms: 35000, issue: 'présence web indisponible' },
  { id: 'instagram',label: 'Recherche Instagram',                    group: 'social',   needsWeb: false, ms: 18000, issue: 'recherche Instagram indisponible' },
  { id: 'facebook', label: 'Recherche Facebook',                     group: 'social',   needsWeb: false, ms: 18000, issue: 'recherche Facebook indisponible' },
  { id: 'youtube',  label: 'Recherche YouTube',                      group: 'social',   needsWeb: false, ms: 18000, issue: 'recherche YouTube indisponible' },
  { id: 'tiktok',   label: 'Recherche TikTok',                        group: 'social',   needsWeb: false, ms: 18000, issue: 'recherche TikTok indisponible' },
  { id: 'linkedin', label: 'Recherche LinkedIn',                     group: 'social',   needsWeb: false, ms: 18000, issue: 'recherche LinkedIn indisponible' },
  { id: 'sirene',   label: 'SIRENE (informations légales)',       group: 'fiche',    needsWeb: false, ms: 15000, issue: 'données légales indisponibles' },
  { id: 'photos',   label: 'Photos de la fiche Google',           group: 'fiche',    needsWeb: false, ms: 15000, issue: 'photos Google indisponibles' },
  { id: 'domain',   label: 'Âge du domaine',                      group: 'fiche',    needsWeb: true,  ms: 12000, issue: 'date de création du domaine indisponible' },
  { id: 'shot',     label: 'Capture d’écran du site',             group: 'site',     needsWeb: true,  ms: 20000, issue: 'capture du site indisponible' },
  { id: 'rivals',   label: 'Concurrents proches',                 group: 'rivals',   needsWeb: false, ms: 25000, issue: 'comparaison des concurrents indisponible' },
  { id: 'perf',     label: 'Performance mobile (PageSpeed)',      group: 'perf',     needsWeb: true,  ms: 60000, issue: 'performance indisponible' },
  { id: 'keywords', label: 'Classement des mots-clés',            group: 'keywords', needsWeb: false, ms: 45000, issue: 'classement des mots-clés indisponible' },
  { id: 'geo',      label: 'Fichiers IA (robots.txt, llms.txt)',  group: 'geo',      needsWeb: true,  ms: 20000, issue: 'fichiers techniques GEO indisponibles' }
];

const clone = o => JSON.parse(JSON.stringify(o));

export function createAuditEngine(deps0) {
  const deps = Object.assign({
    getSupabase: () => null,
    getClient: () => null,
    timeoutScale: () => Number(globalThis.__liveTimeoutScale) || 1,
    wait: ms => new Promise(r => setTimeout(r, ms)),
    now: () => Date.now()
  }, deps0 || {});

  let current = null;            // exécution en cours (ou terminée, tant qu'on ne la remplace pas)
  const listeners = new Set();
  const lastByAudit = new Map(); // dernière exécution terminée par audit (mémoire de session)

  const emit = () => { const s = snapshot(); listeners.forEach(fn => { try { fn(s); } catch (e) { /* un écouteur ne doit jamais casser l'audit */ } }); };
  function snapshot() { return current ? clone(current) : null; }

  /* Sources externes : mêmes fonctions que l'ancienne interface, clés lues en lecture seule. */
  const src = createAuditSources({
    getClient: () => deps.getClient(),
    onSearch: () => { if (current && current.status === 'running') { current.stats.searches += 1; emit(); } },
    onFact: (label, value, detail) => setFact(label, value, detail)
  });

  function setFact(label, value, detail) {
    if (!current || current.status !== 'running') return;
    const f = { label: String(label || ''), value: String(value ?? 'Indisponible'), detail: String(detail || 'Résultat reçu') };
    const i = current.facts.findIndex(x => x.label === f.label);
    if (i >= 0) current.facts[i] = f; else current.facts.push(f);
    current.facts = current.facts.slice(-6);
    emit();
  }

  function progressPct() {
    const applicable = current.sources.filter(s => s.status !== 'skipped');
    if (!applicable.length) return 5;
    const finished = applicable.filter(s => s.status === 'done' || s.status === 'limited').length;
    return Math.min(92, 5 + Math.round(87 * finished / applicable.length));
  }
  function setPhase(phase, pct) { if (current) { current.phase = phase; if (pct != null) current.pct = pct; emit(); } }

  async function start({ audit, client }) {
    if (!audit || current && current.status === 'running') return { started: false, reason: current && current.status === 'running' ? 'busy' : 'missing' };
    const supabase = deps.getSupabase();
    const c = client || null;
    let site = String((c && c.website) || '').trim();
    if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site;
    site = safeHttpUrl(site);
    const hasWeb = !!site;
    const scale = deps.timeoutScale();
    const withTimeout = (promise, ms) => Promise.race([
      Promise.resolve(promise),
      new Promise((_, rej) => setTimeout(() => rej(new Error('délai dépassé')), Math.max(50, ms * scale)))
    ]);

    current = {
      status: 'running', auditId: audit.id, clientId: (c && c.id) || audit.client_id || null,
      clientName: (c && c.name) || 'Commerce', hasWeb, host: hasWeb ? siteHost({ website: site }) : '',
      startedAt: deps.now(), endedAt: null, phase: 'Préparation de l’audit…', pct: 2,
      sources: AUDIT_SOURCES.map(s => ({
        id: s.id, label: s.label, group: s.group, maxSeconds: Math.round(s.ms / 1000),
        status: s.needsWeb && !hasWeb ? 'skipped' : 'pending',
        note: s.needsWeb && !hasWeb ? 'Sans objet : ce commerce n’a pas de site web.' : '',
        startedAt: null, endedAt: null
      })),
      issues: [], facts: [], stats: { searches: 0 }, error: null, result: null
    };
    emit();

    const row = id => current.sources.find(s => s.id === id);
    const issues = current.issues;
    let siteRes = null, scan = null, newDetails = null;
    try {
      current.phase = 'Lecture des sources en parallèle'; current.pct = 5; emit();
      const track = (id, promise, onOk) => {
        const meta = AUDIT_SOURCES.find(s => s.id === id), st = row(id);
        st.status = 'active'; st.startedAt = deps.now(); emit();
        return (async () => {
          let v = null;
          try {
            v = await withTimeout(promise, meta.ms);
            if (v == null) { st.status = 'limited'; st.note = 'Aucune donnée exploitable reçue.'; issues.push(meta.issue); }
            else { if (onOk) onOk(v); st.status = 'done'; }
          } catch (e) {
            st.status = 'limited'; st.note = (e && e.message === 'délai dépassé') ? 'Délai maximum dépassé (' + st.maxSeconds + ' s).' : 'Source indisponible : ' + String((e && e.message) || 'erreur').slice(0, 100);
            issues.push(meta.issue); v = null;
          }
          st.endedAt = deps.now(); current.pct = progressPct(); emit(); return v;
        })();
      };
      const skip = Promise.resolve(null);
      const [html, web, instagram, facebook, youtube, tiktok, linkedin, sir, photos, domain, shot, cp, speed, rk, gf] = await Promise.all([
        hasWeb ? track('site', readSiteHtml(site)) : skip,
        track('presence', src.findWebPresence(c)),
        track('instagram', src.findSocialProfile(c, 'Instagram')),
        track('facebook', src.findSocialProfile(c, 'Facebook')),
        track('youtube', src.findSocialProfile(c, 'YouTube')),
        track('tiktok', src.findSocialProfile(c, 'TikTok')),
        track('linkedin', src.findSocialProfile(c, 'LinkedIn')),
        track('sirene', fetchSirene(c)),
        track('photos', src.fetchPlacePhotos((c && c.details && c.details.place_id) || '')),
        hasWeb ? track('domain', fetchDomainDate(site)) : skip,
        hasWeb ? track('shot', fetchScreenshot(site)) : skip,
        track('rivals', src.fetchCompetitors(c), value => setFact('Concurrents locaux', value.total != null ? value.total + ' commerces' : 'Résultats reçus', value.selfRank ? 'N°' + value.selfRank + ' par nombre d’avis, pas le rang Google' : 'Comparaison du volume d’avis')),
        hasWeb ? track('perf', src.fetchPagespeed(site), value => { scan = value; setFact('Performance mobile', value.scores && value.scores.performance != null ? value.scores.performance + '/100' : 'Mesurée', 'Google PageSpeed Insights · Lighthouse'); }) : skip,
        track('keywords', src.checkRankings(c)),
        hasWeb ? track('geo', fetchGeoFiles(site)) : skip
      ]);

      if (html) { siteRes = analyzeSite(html, site); siteRes.hasWebsite = true; siteRes.pageRead = true; siteRes.geo = Object.assign({}, geoFromHtml(html), gf || {}); setFact('Site web', 'Page lue', (siteRes.finalUrl || site) + ' · ' + ((siteRes.socials || []).length) + ' réseaux sur la page'); }
      else if (hasWeb) { siteRes = { socials: [], directories: [], hasWebsite: true, pageRead: false, analyzedAt: new Date().toISOString(), finalUrl: site }; setFact('Site web', 'Page non lue', 'Les critères de la page ne sont pas notés'); }
      else siteRes = { hasWebsite: false, pageRead: false, socials: [], directories: [], analyzedAt: new Date().toISOString(), finalUrl: null };
      siteRes.socials = siteRes.socials || [];
      const socialFound = [instagram, facebook, youtube, tiktok, linkedin].filter(Boolean);
      const have = new Set(siteRes.socials.map(s => s.net));
      [...(web && web.socials || []), ...socialFound].forEach(w => { if (!have.has(w.net)) { have.add(w.net); siteRes.socials.push(w); } });
      siteRes.directories = web && web.directories || [];
      setFact('Présence en ligne', siteRes.socials.length + ' réseaux · ' + siteRes.directories.length + ' annuaires', 'Profils trouvés par recherche web ou liens du site ; absence de résultat ≠ absence de compte.');
      if (shot) siteRes.screenshot = shot;
      if (cp) siteRes.competitors = cp;
      if (Array.isArray(rk)) { siteRes.rankings = rk; const usable = rk.filter(r => !r.error); const found = usable.filter(r => r.found).length; setFact('Mots-clés', usable.length ? found + ' / ' + usable.length : 'Indisponible', usable.length ? 'Nom ou site trouvé dans l’adresse de la page' : 'La recherche web n’a pas répondu'); }
      if (speed) scan = speed;
      if (domain) newDetails = { ...(newDetails || (c && c.details) || {}), domainCreated: domain };
      if (sir && sir.matched) newDetails = { ...(newDetails || (c && c.details) || {}), sirene: sir };
      if (photos != null) newDetails = { ...(newDetails || (c && c.details) || {}), photoCount: photos };
      if (newDetails && c) { try { await supabase.from('clients').update({ details: newDetails }).eq('id', c.id); } catch (e) { /* même comportement que l'ancienne interface : non bloquant */ } }

      setPhase('Génération du rapport…', 96);
      await deps.wait(280);
      const merged = { ...audit, site: siteRes, scan: scan };
      const diag = visibilityAudit(merged, newDetails ? { ...c, details: newDetails } : c);
      const payload = { score: diag.index, status: 'Analysé', updated_at: new Date().toISOString(), site: siteRes, scan: scan };
      const { error } = await supabase.from('audits').update(payload).eq('id', audit.id);
      if (error) throw new Error(error.message);

      current.pct = 100; current.phase = 'Audit enregistré';
      current.status = 'done'; current.endedAt = deps.now();
      current.result = { score: diag.index, payload, newDetails, issues: issues.slice() };
      emit();
      lastByAudit.set(String(audit.id), clone(current));
      return { started: true, ok: true, payload, newDetails, issues: issues.slice() };
    } catch (e) {
      current.status = 'error'; current.endedAt = deps.now(); current.phase = 'Audit interrompu';
      current.error = 'Erreur pendant l’analyse : ' + String((e && e.message) || 'inconnue').slice(0, 140);
      emit();
      lastByAudit.set(String(audit.id), clone(current));
      return { started: true, ok: false, error: current.error };
    }
  }

  return {
    start,
    state: snapshot,
    isRunning: () => !!(current && current.status === 'running'),
    runningAuditId: () => (current && current.status === 'running') ? current.auditId : null,
    last: auditId => lastByAudit.get(String(auditId)) || null,
    /* Acquitte une exécution terminée (l'écran l'a affichée) : l'état redevient « aucune analyse ». */
    dismiss: () => { if (current && current.status !== 'running') { current = null; emit(); } },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
