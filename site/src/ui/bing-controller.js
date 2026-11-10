// AuditIA — statistiques Bing Webmaster en lecture seule pour un client.
import { secureApi } from '../api/secure-api.js';
import { escHtml, safeHttpUrl } from '../core/utils.js';

function dateText(value) {
  let date = null;
  const ms = String(value || '').match(/\/Date\((\d+)\)\//);
  if (ms) date = new Date(Number(ms[1]));
  else if (value) date = new Date(value);
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR') : 'Date indisponible';
}
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : '—';
}

export function createBingController(ctx) {
  const state = { loading: '', data: {}, errors: {} };
  function html(client) {
    const id = String(client.id);
    const website = safeHttpUrl(client.website);
    const loading = state.loading === id;
    const data = state.data[id];
    const error = state.errors[id];
    const rows = data && Array.isArray(data.traffic) ? data.traffic.slice(-10).reverse() : [];
    const last30 = data && Array.isArray(data.traffic) ? data.traffic.slice(-30) : [];
    const clicks = last30.reduce((sum, row) => sum + (Number(row.Clicks) || 0), 0);
    const impressions = last30.reduce((sum, row) => sum + (Number(row.Impressions) || 0), 0);
    const ctr = impressions ? (clicks / impressions * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %' : '—';
    const table = rows.length ? `<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>Date</th><th>Clics</th><th>Impressions</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escHtml(dateText(row.Date))}</td><td>${escHtml(num(row.Clicks))}</td><td>${escHtml(num(row.Impressions))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="ds-row__meta">Bing n’a pas encore retourné de données pour cette propriété. Cela peut arriver après une vérification récente ou si le site a peu de trafic.</p>';
    const body = !website
      ? '<p class="ds-row__meta">Ajoutez d’abord l’adresse du site dans la fiche client.</p>'
      : `<p class="ds-row__meta">Les statistiques sont récupérées depuis Bing pour le site vérifié associé à cette adresse. Aucune donnée n’est simulée.</p><button type="button" class="ds-btn ds-btn--primary" data-bing-client="${escHtml(id)}" ${loading ? 'disabled' : ''}>${loading ? 'Chargement Bing…' : data ? 'Actualiser les données Bing' : 'Charger les données Bing'}</button>`;
    const stats = data ? `<p class="ds-row__meta">Propriété Bing : <b>${escHtml(data.siteUrl || '')}</b></p><div class="ds-grid ds-detail-kpis"><div class="ds-stat"><span>Clics (30 dernières entrées)</span><b>${escHtml(num(clicks))}</b></div><div class="ds-stat"><span>Impressions</span><b>${escHtml(num(impressions))}</b></div><div class="ds-stat"><span>CTR calculé</span><b>${escHtml(ctr)}</b></div></div>${table}` : '';
    return `<section class="ds-card ds-bing"><div class="ds-card__head"><h3>Visibilité Bing Webmaster</h3><span class="ds-badge ds-badge--neutral">Données réelles</span></div>${body}${error ? `<p class="ds-msg ds-msg--error" role="alert">${escHtml(error)}</p>` : ''}${stats}<p class="ds-row__meta">Le site doit être vérifié dans le compte Bing connecté aux réglages AuditIA. Le CTR est calculé à partir des clics et impressions reçus.</p></section>`;
  }
  async function load(client) {
    const id = String(client.id);
    if (state.loading) return;
    const siteUrl = safeHttpUrl(client.website);
    if (!siteUrl) { state.errors[id] = 'Adresse de site manquante ou invalide dans cette fiche client.'; ctx.rerender(); return; }
    state.loading = id; delete state.errors[id]; ctx.rerender();
    try {
      const result = await secureApi(ctx.getSupabase, { action: 'bing_site_stats', siteUrl }, 20000);
      state.data[id] = result;
    } catch (e) {
      state.errors[id] = e && e.message ? e.message : 'Impossible de récupérer les données Bing.';
    } finally {
      state.loading = ''; ctx.rerender();
    }
  }
  return { html, onClick(target) { const button = target.closest('[data-bing-client]'); if (!button) return false; const client = ctx.getClient(button.dataset.bingClient); if (client) load(client); return true; }, reset() { state.loading = ''; state.data = {}; state.errors = {}; } };
}
