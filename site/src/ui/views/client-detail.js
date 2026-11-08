// AuditIA — fiche d'un client : coordonnées, indicateurs, évolution du score, audits associés.
// Lot 4 : lancement d'un audit complet et ouverture du dossier d'audit depuis la fiche.
import { btn, card, stat, badge, scoreBadge, sparkline, emptyState, linkBtn, avatar } from '../components/ui.js';
import { clientDetail, clientInfoRows, clientCategory } from '../../data/portfolio.js';
import { auditHasAnalysis } from '../../audit/scoring.js';
import { escHtml, safeHttpUrl, formatGoogleProfileSummary } from '../../core/utils.js';
import { bannerSlot } from './audit-live.js';
import { noticeBlock } from './audits.js';

function infoCard(c) {
  const d = c.details || {};
  const rows = clientInfoRows(c);
  if (!rows.length) return '';
  const hours = d.hours && d.hours.length
    ? `<div class="ds-hours"><b>Horaires</b><ul>${d.hours.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul></div>` : '';
  const dl = `<dl class="ds-info">${rows.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl>`;
  return card({ title: 'Informations', body: dl + hours });
}

function auditsCard(audits, c, ctl) {
  const running = ctl && ctl.runningId();
  const launch = running
    ? '<p class="ds-row__meta">Une analyse est déjà en cours : attendez sa fin pour en lancer une autre.</p>'
    : btn({ label: ctl && ctl.state.launching ? 'Préparation…' : (audits.some(a => !auditHasAnalysis(a)) ? 'Lancer l’analyse' : '＋ Nouvel audit'), variant: 'primary', attrs: `data-audit-launch="${escHtml(c.id)}" ${ctl && ctl.state.launching ? 'disabled' : ''}` });
  if (!audits.length) return card({ title: 'Audits de ce client', body: `<p class="ds-row__meta">Aucun audit pour ce client. Lancez son premier audit : 10 sources sont interrogées et le score n’apparaît qu’après l’analyse.</p>${launch}` });
  const rows = audits.map(a => {
    const done = auditHasAnalysis(a);
    const score = Math.max(0, Math.min(100, Math.round(Number(a.score) || 0)));
    const busy = running && String(running) === String(a.id);
    return `<li><button type="button" class="ds-row ds-row--btn" data-open-audit="${escHtml(a.id)}"><span class="ds-row__main"><span class="ds-row__title">${escHtml(a.title || 'Audit')}</span><span class="ds-row__meta">${escHtml(a.status || 'À démarrer')}</span></span>${busy ? badge('En cours', 'warn') : done ? scoreBadge(score) : badge('À analyser')}<span class="ds-row__chev" aria-hidden="true">›</span></button></li>`;
  }).join('');
  return card({ title: 'Audits de ce client', body: `<ul class="ds-list">${rows}</ul><div class="ds-d-actions">${launch}</div>` });
}

export function clientDetailView(c, audits, ctl) {
  const d = c.details || {};
  const info = clientDetail(c, audits);
  const tel = String(c.phone || d.phone || '').replace(/[^\d+]/g, '');
  const site = safeHttpUrl(c.website);
  const mapsQ = encodeURIComponent([c.name, d.address || c.city].filter(Boolean).join(' '));
  const sub = [c.city, clientCategory(c)].filter(Boolean).join(' · ');
  const googleSummary = formatGoogleProfileSummary(d.rating, d.reviews);
  const header = `<section class="ds-card ds-client-head">
    <div class="ds-client-id">${avatar(c.name)}<div class="ds-client-id__txt"><h2>${escHtml(c.name || 'Commerce')}</h2>${sub ? `<p class="ds-row__meta">${escHtml(sub)}</p>` : ''}${googleSummary ? `<p class="ds-row__meta">${escHtml(googleSummary)} · Google</p>` : ''}</div></div>
    <div class="ds-d-actions">
      ${tel ? linkBtn({ label: 'Appeler', href: 'tel:' + tel }) : ''}
      ${site ? linkBtn({ label: 'Site web', href: site, external: true }) : ''}
      ${linkBtn({ label: 'Localiser', href: 'https://www.google.com/maps/search/?api=1&query=' + mapsQ, external: true })}
    </div></section>`;
  const stats = `<div class="ds-grid ds-detail-kpis">
    ${stat({ label: 'Audits', value: String(info.audits.length) })}
    ${stat({ label: 'Score moyen', value: info.avg == null ? '—' : info.avg + '/100' })}
    ${stat({ label: 'Dernier score', value: info.last ? (info.last.score || 0) + '/100' : '—' })}
  </div>`;
  const evo = info.showEvolution
    ? card({ title: 'Évolution du score', body: `<div class="ds-spark-wrap">${sparkline(info.history)}</div><p class="ds-row__meta">Du plus ancien au plus récent audit.</p>` }) : '';
  return `${btn({ label: '← Clients', attrs: 'data-nav="clients"' })}
    ${bannerSlot(ctl ? ctl.snapshot() : null)}${noticeBlock(ctl ? ctl.notice() : null)}
    <div class="ds-detail">
      <div class="ds-d-stack ds-detail__main">${header}${stats}${auditsCard(info.audits, c, ctl)}</div>
      <div class="ds-d-stack ds-detail__side">${evo}${infoCard(c)}</div>
    </div>`;
}
