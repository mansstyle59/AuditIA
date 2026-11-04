// AuditIA — vue « Prospects » : recherche de commerces, commerces proches, ajout manuel.
// Affichage seulement : l'état et les appels réseau sont gérés par search-controller.js.
import { badge, btn, emptyState, errorCard, linkBtn, spinnerCard, avatar } from '../components/ui.js';
import { escHtml, safeHttpUrl } from '../../core/utils.js';
import { nearbyOpportunity } from '../../api/places-model.js';
import { CATEGORIES, filterLabels, findDuplicate } from '../../data/places-search.js';

const TABS = [['nl', 'Recherche'], ['nearby', 'Autour de moi'], ['manual', 'Ajout manuel']];
const EXAMPLES = ['Restaurants à Narbonne sans site web', 'Plombiers dans l’Aude avec au moins 20 avis', 'Coiffeurs près de Carcassonne mal notés'];

function tabsHtml(tab) {
  return `<div class="ds-seg" role="tablist" aria-label="Mode de recherche">${TABS.map(([id, label]) =>
    `<button type="button" role="tab" class="ds-seg__btn${tab === id ? ' is-on' : ''}" aria-selected="${tab === id}" data-ps-tab="${id}">${escHtml(label)}</button>`).join('')}</div>`;
}

// ---------- fiche d'un commerce trouvé ----------
function statusLabel(s) {
  return s === 'CLOSED_PERMANENTLY' ? 'Fermé définitivement' : s === 'CLOSED_TEMPORARILY' ? 'Fermé temporairement' : '';
}

export function placeCard(p, index, src, clients, adding) {
  const opp = nearbyOpportunity(p);
  const dup = findDuplicate(clients, p);
  const tone = opp.closed ? 'danger' : opp.score >= 60 ? 'good' : opp.score >= 30 ? 'warn' : 'neutral';
  const meta = [p.category, p.address].filter(Boolean).join(' · ');
  const rating = p.rating != null ? `★ ${p.rating} (${p.reviews || 0} avis)` : 'Pas de note';
  const closed = statusLabel(p.status);
  const site = safeHttpUrl(p.website);
  const reasons = opp.reasons.length ? `<ul class="ds-place__why">${opp.reasons.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul>` : '';
  const action = dup
    ? `<span class="ds-place__dup">${badge('Déjà dans votre portefeuille', 'good')}</span>${btn({ label: 'Voir la fiche', attrs: `data-open-client="${escHtml(dup.client.id)}"` })}`
    : btn({ label: adding ? 'Ajout…' : 'Ajouter au portefeuille', variant: 'primary', attrs: `data-ps-add="${index}" data-ps-src="${src}"${adding ? ' disabled' : ''}` });
  return `<article class="ds-card ds-place">
    <div class="ds-place__head">${avatar(p.name)}<div class="ds-place__id"><h3 class="ds-place__name">${escHtml(p.name)}</h3><p class="ds-row__meta">${escHtml(meta)}</p></div></div>
    <div class="ds-place__badges">${badge(rating)}${site ? badge('Site web') : badge('Sans site web', 'warn')}${closed ? badge(closed, 'danger') : ''}${badge('Opportunité ' + opp.score + '/100', tone)}</div>
    ${reasons}
    <div class="ds-place__actions">${action}</div>
  </article>`;
}

function resultsList(rows, src, clients, adding) {
  return `<div class="ds-places">${rows.map((p, i) => placeCard(p, i, src, clients, adding)).join('')}</div>`;
}

function configCard(err) {
  return `<div class="ds-card ds-empty ds-empty--error" role="alert"><h2 class="ds-card__title">Clé Google Places manquante</h2>
    <p class="ds-empty__text">${escHtml(err || 'Aucune clé Google Places n’est enregistrée.')} Elle se configure dans les Réglages de l’interface actuelle (le lot Réglages arrive plus tard).</p>
    <div class="ds-d-actions">${linkBtn({ label: 'Ouvrir l’interface actuelle', href: './', primary: true })}</div></div>`;
}

function failure(kind, message, retry) {
  if (kind === 'config') return configCard(message);
  const title = kind === 'network' ? 'Connexion impossible' : kind === 'timeout' ? 'Délai dépassé' : 'Erreur Google Places';
  return errorCard({ title, text: message, attrs: `data-ps-retry="${retry}"` });
}

// ---------- onglet 1 : recherche en langage naturel ----------
function nlForm(s) {
  return `<form class="ds-card ds-psearch" id="psNlForm" novalidate>
    <label class="ds-field"><span class="ds-field__label">Décrivez les commerces que vous cherchez</span>
      <input class="ds-input" name="query" type="search" autocomplete="off" maxlength="200" placeholder="Ex. Restaurants à Narbonne sans site web" value="${escHtml(s.nl.q)}" data-ps-nlq></label>
    <div class="ds-chips" role="group" aria-label="Exemples">${EXAMPLES.map(e => `<button type="button" class="ds-chip" data-ps-example="${escHtml(e)}">${escHtml(e)}</button>`).join('')}</div>
    <div class="ds-d-actions">${btn({ label: s.nl.status === 'loading' ? 'Recherche…' : 'Rechercher', variant: 'primary', type: 'submit', attrs: s.nl.status === 'loading' ? 'disabled' : '' })}</div>
  </form>`;
}

function notes(parsedLabels, extra) {
  const n = [];
  if (parsedLabels.length) n.push(`<p class="ds-note">Filtres reconnus : ${parsedLabels.map(escHtml).join(' · ')}</p>`);
  extra.forEach(t => n.push(`<p class="ds-note ds-note--warn" role="status">${escHtml(t)}</p>`));
  return n.join('');
}

function nlOut(s, clients) {
  const n = s.nl;
  if (n.status === 'loading') return spinnerCard('Recherche des établissements correspondant à votre demande…');
  if (n.status === 'error') return failure(n.errKind, n.error, 'nl');
  if (n.status !== 'done') return emptyState({ title: 'Décrivez votre cible', text: 'Activité, ville et critères : sans site web, note basse, nombre d’avis.' });
  const extra = [];
  if (n.removed > 0) extra.push(`Résultats partiels : ${n.removed} établissement${n.removed > 1 ? 's' : ''} écarté${n.removed > 1 ? 's' : ''} par les filtres.`);
  if (n.raw >= 20) extra.push('Google renvoie au plus 20 établissements : précisez la ville ou l’activité pour affiner.');
  const head = notes(filterLabels(n.parsed), extra);
  if (!n.rows.length) return head + emptyState({ title: 'Aucun résultat', text: 'Aucun établissement ne correspond. Essayez une formulation plus courte, ou retirez un critère.' });
  return head + `<p class="ds-row__meta" aria-live="polite">${n.rows.length} établissement${n.rows.length > 1 ? 's' : ''} trouvé${n.rows.length > 1 ? 's' : ''} · vérifiez les fiches avant d’ajouter</p>` + resultsList(n.rows, 'nl', clients, s.adding);
}

// ---------- onglet 2 : commerces proches ----------
function nearbyOut(s, clients) {
  const n = s.nearby;
  if (n.status === 'loading') return spinnerCard(n.msg || 'Recherche des établissements proches…');
  if (n.status === 'error') return failure(n.errKind, n.error, 'nearby');
  const denied = n.status === 'denied';
  const city = `<form class="ds-card ds-psearch" id="psCityForm" novalidate>
    <p class="ds-note ds-note--warn" role="alert">${escHtml(n.error)}</p>
    <p class="ds-empty__text">Pas de position ? Indiquez une ville : la recherche utilisera Google Places par ville (sans rayon de 5 km).</p>
    <label class="ds-field"><span class="ds-field__label">Ville</span><input class="ds-input" name="city" type="text" autocomplete="off" maxlength="80" placeholder="Ex. Narbonne" value="${escHtml(n.city)}"></label>
    <div class="ds-d-actions">${btn({ label: 'Chercher dans cette ville', variant: 'primary', type: 'submit' })}${btn({ label: 'Réessayer la localisation', attrs: 'data-ps-nearby' })}</div></form>`;
  if (denied) return city;
  if (n.status !== 'done') return emptyState({ title: 'Commerces proches', text: 'Le navigateur vous demandera l’autorisation d’utiliser votre position. Rayon de recherche : 5 km.' });
  const where = n.mode === 'city' ? `dans « ${n.city} »` : 'dans un rayon de 5 km';
  const extra = n.raw >= 20 ? ['Google renvoie au plus 20 établissements : la liste peut être incomplète.'] : [];
  if (!n.rows.length) return notes([], extra) + emptyState({ title: 'Aucun résultat', text: `Aucun commerce trouvé ${where}. Essayez la recherche en langage naturel.` });
  return notes([], extra) + `<p class="ds-row__meta" aria-live="polite">${n.rows.length} commerce${n.rows.length > 1 ? 's' : ''} ${where}, classés par opportunité (points publics à vérifier)</p>` + resultsList(n.rows, 'nearby', clients, s.adding);
}

// ---------- onglet 3 : ajout manuel ----------
function addForm(s, clients) {
  const p = s.manual.picked;
  const dup = p.placeId || p.name ? findDuplicate(clients, p) : null;
  const d = [];
  if (p.address) d.push(['Adresse', p.address]);
  if (p.phone) d.push(['Téléphone', p.phone]);
  if (p.rating != null) d.push(['Note Google', `★ ${p.rating} (${p.reviews || 0} avis)`]);
  if (Array.isArray(p.hours) && p.hours.length) d.push(['Horaires', p.hours.length + ' jours renseignés']);
  if (statusLabel(p.status)) d.push(['Statut', statusLabel(p.status)]);
  const info = d.length ? `<dl class="ds-kv">${d.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl>` : '';
  const src = p.placeId ? '<p class="ds-note">Fiche chargée depuis Google Places. Vous pouvez corriger les champs avant l’ajout.</p>' : '<p class="ds-note">Saisie libre : seuls ces champs seront enregistrés.</p>';
  const dupHtml = dup ? `<p class="ds-note ds-note--warn" role="alert">« ${escHtml(dup.client.name)} » est déjà dans votre portefeuille.</p><div class="ds-d-actions">${btn({ label: 'Voir la fiche', attrs: `data-open-client="${escHtml(dup.client.id)}"` })}</div>` : '';
  return `<form class="ds-card ds-psearch" id="psAddForm" novalidate>
    <h2 class="ds-card__title">${p.placeId ? 'Commerce sélectionné' : 'Nouveau commerce'}</h2>${src}${info}
    <div class="ds-form-grid">
      <label class="ds-field"><span class="ds-field__label">Nom</span><input class="ds-input" name="name" required maxlength="120" value="${escHtml(p.name || '')}"></label>
      <label class="ds-field"><span class="ds-field__label">Ville</span><input class="ds-input" name="city" maxlength="120" value="${escHtml(p.city || '')}"></label>
      <label class="ds-field"><span class="ds-field__label">Catégorie</span><select class="ds-input" name="category">${CATEGORIES.map(c => `<option${(p.category || 'Autre') === c ? ' selected' : ''}>${escHtml(c)}</option>`).join('')}</select></label>
      <label class="ds-field"><span class="ds-field__label">Site web</span><input class="ds-input" name="website" type="text" inputmode="url" autocapitalize="none" placeholder="https://…" value="${escHtml(p.website || '')}"></label>
    </div>
    ${dupHtml}
    <div class="ds-d-actions">${btn({ label: s.adding ? 'Ajout…' : 'Ajouter au portefeuille', variant: 'primary', type: 'submit', attrs: s.adding || dup ? 'disabled' : '' })}${btn({ label: 'Annuler', attrs: 'data-ps-cancel' })}</div>
  </form>`;
}

function manualOut(s, clients) {
  const m = s.manual;
  if (m.picked) return addForm(s, clients);
  if (s.key.status === 'missing') return emptyState({ title: 'Saisie libre', text: 'La clé Google Places n’est pas configurée : les fiches Google ne sont pas disponibles. Utilisez « Saisir à la main ».' });
  if (m.pickStatus === 'loading') return spinnerCard('Chargement de la fiche…');
  const pickErr = m.pickStatus === 'error' ? `<p class="ds-note ds-note--warn" role="alert">${escHtml(m.pickError)}</p>` : '';
  let list = '';
  if (m.status === 'loading') list = '<p class="ds-row__meta" role="status">Recherche…</p>';
  else if (m.status === 'error') list = `<p class="ds-note ds-note--warn" role="alert">${escHtml(m.error)}</p>`;
  else if (m.status === 'done' && !m.suggestions.length) list = '<p class="ds-row__meta" role="status">Aucun commerce trouvé. Essayez le nom et la ville.</p>';
  else if (m.suggestions.length) list = `<ul class="ds-list ds-suggest">${m.suggestions.map(x => `<li><button type="button" class="ds-row ds-row--btn" data-ps-pick="${escHtml(x.placeId)}"><span class="ds-row__main"><span class="ds-row__title">${escHtml(x.main)}</span>${x.secondary ? `<span class="ds-row__meta">${escHtml(x.secondary)}</span>` : ''}</span><span class="ds-row__chev" aria-hidden="true">›</span></button></li>`).join('')}</ul>`;
  return pickErr + list;
}

function manualHead(s) {
  const noKey = s.key.status === 'missing';
  const search = noKey ? '' : `<label class="ds-field"><span class="ds-field__label">Nom du commerce (Google propose les fiches)</span>
      <input class="ds-input" type="search" autocomplete="off" maxlength="120" placeholder="Ex. Boulangerie Dupont Carcassonne" value="${escHtml(s.manual.q)}" data-ps-ac></label>`;
  return `<div class="ds-card ds-psearch">${search}<div class="ds-d-actions">${btn({ label: 'Saisir à la main', attrs: 'data-ps-manual' })}</div></div>`;
}

// ---------- vue complète ----------
export function noticeHtml(n) {
  if (!n) return '';
  const cls = n.kind === 'ok' ? 'ds-msg ds-msg--ok' : n.kind === 'dup' ? 'ds-msg ds-msg--warn' : 'ds-msg ds-msg--error';
  const link = n.clientId ? ` <button type="button" class="ds-linkbtn" data-open-client="${escHtml(n.clientId)}">Voir la fiche</button>` : '';
  return `<div class="${cls}" role="${n.kind === 'error' ? 'alert' : 'status'}">${escHtml(n.text)}${link}</div>`;
}

export function outHtml(s, clients) {
  if (s.tab === 'nl') return s.key.status === 'missing' ? configCard('') : nlOut(s, clients);
  if (s.tab === 'nearby') return s.key.status === 'missing' ? configCard('') : nearbyOut(s, clients);
  return manualOut(s, clients);
}

export function prospectsView(s, clients) {
  const keyBusy = s.key.status === 'idle' || s.key.status === 'loading';
  if (s.key.status === 'error') return errorCard({ title: 'Clé Google Places illisible', text: s.key.error, attrs: 'data-ps-keyretry' });
  const head = s.tab === 'nl' ? nlForm(s)
    : s.tab === 'nearby' ? `<div class="ds-card ds-psearch"><p class="ds-empty__text">Les commerces autour de vous, classés par score d’opportunité.</p><div class="ds-d-actions">${btn({ label: s.nearby.status === 'loading' ? 'Recherche…' : 'Chercher autour de moi', variant: 'primary', attrs: 'data-ps-nearby' + (s.nearby.status === 'loading' ? ' disabled' : '') })}</div></div>`
      : manualHead(s);
  const body = keyBusy && s.tab !== 'manual' ? spinnerCard('Préparation de la recherche…') : outHtml(s, clients);
  return `<div class="ds-d-stack">${tabsHtml(s.tab)}<div id="psNotice">${noticeHtml(s.notice)}</div>
    <div class="ds-psplit"><div class="ds-psplit__form">${s.key.status === 'missing' && s.tab !== 'manual' ? '' : head}</div><div class="ds-psplit__out ds-d-stack" id="psOut">${body}</div></div></div>`;
}
