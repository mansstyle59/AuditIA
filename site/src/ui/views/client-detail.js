// AuditIA — fiche d'un client : coordonnées, indicateurs, évolution du score, audits associés.
// L'ouverture détaillée d'un audit arrive au lot 4 ; la liste des audits du client est déjà réelle.
import { btn, card, stat, badge, scoreBadge, sparkline, emptyState, linkBtn, avatar } from '../components/ui.js';
import { clientDetail, clientInfoRows, clientCategory } from '../../data/portfolio.js';
import { auditHasAnalysis } from '../../audit/scoring.js';
import { escHtml, safeHttpUrl } from '../../core/utils.js';

function infoCard(c) {
  const d = c.details || {};
  const rows = clientInfoRows(c);
  if (!rows.length) return '';
  const hours = d.hours && d.hours.length
    ? `<div class="ds-hours"><b>Horaires</b><ul>${d.hours.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul></div>` : '';
  const dl = `<dl class="ds-info">${rows.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl>`;
  return card({ title: 'Informations', body: dl + hours });
}

function auditsCard(audits) {
  if (!audits.length) return card({ title: 'Audits de ce client', body: emptyState({ title: 'Aucun audit', text: 'Aucun audit pour ce client pour le moment. La création d’un audit sera disponible dans la nouvelle interface au lot 4.' }) });
  const rows = audits.map(a => {
    const done = auditHasAnalysis(a);
    const score = Math.max(0, Math.min(100, Math.round(Number(a.score) || 0)));
    return `<li class="ds-row"><div class="ds-row__main"><span class="ds-row__title">${escHtml(a.title || 'Audit')}</span><span class="ds-row__meta">${escHtml(a.status || 'À démarrer')}</span></div>${done ? scoreBadge(score) : badge('À analyser')}</li>`;
  }).join('');
  return card({ title: 'Audits de ce client', body: `<ul class="ds-list">${rows}</ul><p class="ds-row__meta ds-note">Le détail complet d’un audit sera disponible au lot 4.</p>` });
}

export function clientDetailView(c, audits) {
  const d = c.details || {};
  const info = clientDetail(c, audits);
  const tel = String(c.phone || d.phone || '').replace(/[^\d+]/g, '');
  const site = safeHttpUrl(c.website);
  const mapsQ = encodeURIComponent([c.name, d.address || c.city].filter(Boolean).join(' '));
  const sub = [c.city, clientCategory(c)].filter(Boolean).join(' · ');
  const header = `<section class="ds-card ds-client-head">
    <div class="ds-client-id">${avatar(c.name)}<div class="ds-client-id__txt"><h2>${escHtml(c.name || 'Commerce')}</h2>${sub ? `<p class="ds-row__meta">${escHtml(sub)}</p>` : ''}${d.rating != null ? `<p class="ds-row__meta">★ ${escHtml(d.rating)} · ${escHtml(d.reviews || 0)} avis Google</p>` : ''}</div></div>
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
    <div class="ds-detail">
      <div class="ds-d-stack ds-detail__main">${header}${stats}${auditsCard(info.audits)}</div>
      <div class="ds-d-stack ds-detail__side">${evo}${infoCard(c)}</div>
    </div>`;
}
