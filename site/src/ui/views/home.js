// AuditIA — page d'accueil : mêmes composants, compositions différentes selon l'écran.
import { btn, stat, card, scoreBadge, bar, sectionTitle, listItem, demoBanner } from '../components/ui.js';

function auditList(audits) {
  return `<ul class="ds-list">${audits.map(a =>
    listItem({ title: a.client, meta: a.meta, right: scoreBadge(a.score) })
  ).join('')}</ul>`;
}

function actionBars(actions) {
  return `<div class="ds-d-stack">${actions.map(a => bar({ label: a.label, pct: a.pct })).join('')}</div>`;
}

function distributionBars(distribution, total) {
  return distribution.map(d => bar({ label: `${d.label} (${d.count})`, pct: Math.round((d.count / total) * 100) })).join('');
}

// Mobile : une colonne, cartes empilées, actions au pouce
export function homeMobile(data) {
  const total = data.distribution.reduce((sum, d) => sum + d.count, 0);
  return `
    ${demoBanner()}
    <div class="ds-grid">${data.kpis.map(stat).join('')}</div>

    ${sectionTitle('Actions rapides')}
    <div class="ds-grid">
      ${btn({ label: 'Nouvel audit', variant: 'primary', block: true })}
      ${btn({ label: 'Ajouter un client', block: true })}
    </div>

    ${sectionTitle('Derniers audits')}
    ${card({ body: auditList(data.audits) })}

    ${sectionTitle('Répartition des scores')}
    ${card({ body: `<div class="ds-d-stack">${distributionBars(data.distribution, total)}</div>` })}

    ${sectionTitle('À traiter')}
    ${card({ body: actionBars(data.actions) })}
  `;
}

// Ordinateur : indicateurs en ligne, deux colonnes (audits à gauche, synthèse à droite)
export function homeDesktop(data) {
  const total = data.distribution.reduce((sum, d) => sum + d.count, 0);
  return `
    ${demoBanner()}
    <div class="ds-d-toolbar">
      <p class="ds-row__meta">Vue d'ensemble de votre activité</p>
      <div class="ds-d-actions">
        ${btn({ label: 'Ajouter un client' })}
        ${btn({ label: 'Nouvel audit', variant: 'primary' })}
      </div>
    </div>

    <div class="ds-grid ds-d-kpis">${data.kpis.map(stat).join('')}</div>

    <div class="ds-d-split">
      <div class="ds-d-stack">
        ${card({ title: 'Derniers audits', body: auditList(data.audits) })}
      </div>
      <div class="ds-d-stack">
        ${card({ title: 'Répartition des scores', body: `<div class="ds-d-stack">${distributionBars(data.distribution, total)}</div>` })}
        ${card({ title: 'À traiter', body: actionBars(data.actions) })}
      </div>
    </div>
  `;
}
