// AuditIA — LOT 6 : écran Réglages (profil, marque, services). Même vue en HTML ; la mise en page mobile / ordinateur est faite en CSS.
import { card, btn, badge, spinnerCard, errorCard } from '../components/ui.js';
import { accountCard } from './account.js';
import { escHtml } from '../../core/utils.js';
import { EDITABLE, API_SERVICES, API_META_FIELDS } from '../../settings/settings-model.js';

const fmt = iso => { try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }); } catch (e) { return ''; } };

function field(f, s) {
  const v = s.draft[f.key] == null ? '' : s.draft[f.key]; const err = s.errors[f.key];
  const dis = !s.canEdit || s.saving ? 'disabled' : '';
  const id = 'st_' + f.key; const eid = id + '_e';
  const common = `id="${id}" data-settings-field="${f.key}" ${dis} ${err ? `aria-invalid="true" aria-describedby="${eid}"` : ''}`;
  const input = f.long
    ? `<textarea class="ds-input ds-textarea" rows="3" maxlength="${f.max}" ${common}>${escHtml(v)}</textarea>`
    : f.type === 'color'
      ? `<input class="ds-input ds-color" type="color" value="${escHtml(v)}" ${common}>`
      : `<input class="ds-input" type="${f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}" ${f.type === 'url' ? 'inputmode="url" autocapitalize="off"' : ''} maxlength="${f.max}" value="${escHtml(v)}" autocomplete="off" ${common}>`;
  return `<div class="ds-field"><label class="ds-field__label" for="${id}">${escHtml(f.label)}${f.required ? ' *' : ''}</label>${input}${err ? `<p class="ds-field__err" id="${eid}" role="alert">${escHtml(err)}</p>` : ''}</div>`;
}

function apiField(svc, s) {
  const status = s.apiStatus && s.apiStatus[svc.column] || {};
  const configured = !!status.configured;
  const stored = !!status.stored;
  const disabled = !s.canEdit || s.apiSaving ? 'disabled' : '';
  const id = 'api_' + svc.column;
  const placeholder = stored
    ? 'Clé enregistrée — saisir une nouvelle valeur pour remplacer'
    : status.server
      ? 'Secret serveur actif — saisir une surcharge facultative'
      : 'Coller la clé API ici';
  const state = configured
    ? (stored ? badge('Clé enregistrée', 'neutral') : badge('Secret serveur', 'neutral'))
    : badge('À configurer', 'warn');
  const keyInput = `<div class="ds-api-keyline"><input class="ds-input" id="${id}" type="password" data-api-field="${svc.column}" value="${escHtml(s.apiDraft && s.apiDraft[svc.column] || '')}" placeholder="${escHtml(placeholder)}" autocomplete="new-password" autocapitalize="off" spellcheck="false" ${disabled}><button type="button" class="ds-btn ds-api-action" data-api-reveal="${svc.column}" ${disabled}>Afficher</button></div>`;
  const clear = stored
    ? `<button type="button" class="ds-api-clear" data-api-clear="${svc.column}" ${disabled}>Supprimer la clé enregistrée</button>`
    : '';
  const usage = svc.used
    ? '<span class="ds-api-use ds-api-use--active">Utilisée dans AuditIA</span>'
    : '<span class="ds-api-use">Enregistrée pour intégration ultérieure</span>';
  const hint = status.hint ? `<small class="ds-api-hint">${escHtml(status.source || 'Clé disponible')} · ${escHtml(status.hint)}</small>` : `<small class="ds-api-hint">${escHtml(status.source || 'Aucune clé enregistrée')}</small>`;
  return `<article class="ds-api-service">
    <div class="ds-api-service__top"><div><h4>${escHtml(svc.label)}</h4><p>${escHtml(svc.role)}</p></div>${state}</div>
    ${usage}${keyInput}${hint}
    <div class="ds-api-service__actions"><a class="ds-api-link" href="${escHtml(svc.url)}" target="_blank" rel="noopener noreferrer">${escHtml(svc.link)} ↗</a>${clear}</div>
  </article>`;
}

function servicesCard(s) {
  const primary = API_SERVICES.filter(x => x.group === 'core').map(x => apiField(x, s)).join('');
  const other = API_SERVICES.filter(x => x.group === 'other').map(x => apiField(x, s)).join('');
  const fields = API_META_FIELDS.map(f => {
    const id = 'api_' + f.key;
    const value = s.apiOther && s.apiOther[f.key] || '';
    const disabled = !s.canEdit || s.apiSaving ? 'disabled' : '';
    const control = f.type === 'textarea'
      ? `<textarea class="ds-input ds-textarea" id="${id}" rows="3" maxlength="${f.max}" data-api-field="${f.key}" placeholder="${escHtml(f.hint)}" ${disabled}>${escHtml(value)}</textarea>`
      : `<input class="ds-input" id="${id}" type="${f.type === 'url' ? 'url' : 'text'}" maxlength="${f.max}" data-api-field="${f.key}" value="${escHtml(value)}" placeholder="${escHtml(f.hint)}" autocomplete="off" ${disabled}>`;
    return `<div class="ds-field"><label class="ds-field__label" for="${id}">${escHtml(f.label)}</label>${control}</div>`;
  }).join('');
  const note = s.apiError
    ? `<p class="ds-msg ds-msg--warn">${escHtml(s.apiError)}</p>`
    : '<p class="ds-hint">Les clés sensibles sont envoyées uniquement à la fonction serveur AuditIA. Elles ne sont jamais relues en clair dans le navigateur, ni placées dans le cache local.</p>';
  const notice = s.apiNotice ? `<p class="ds-msg ds-msg--${s.apiNotice.kind === 'ok' ? 'ok' : 'error'}" role="${s.apiNotice.kind === 'ok' ? 'status' : 'alert'}">${escHtml(s.apiNotice.text)}</p>` : '';
  const actions = s.canEdit
    ? `<div class="ds-savebar ds-api-savebar"><span class="ds-api-savehint">${s.apiSaving ? 'Enregistrement sécurisé…' : 'Les changements sont enregistrés sur votre compte.'}</span><button type="submit" class="ds-btn ds-btn--primary" data-api-save ${!s.apiDirty || s.apiSaving ? 'disabled' : ''}>${s.apiSaving ? 'Enregistrement…' : 'Enregistrer les intégrations'}</button></div>`
    : '<p class="ds-msg ds-msg--warn">Lecture seule : seul le compte administrateur peut modifier les intégrations.</p>';
  return card({
    title: 'API et intégrations',
    body: `<form data-api-settings-form novalidate>
      <p class="ds-api-intro">Gérez les connexions utilisées par AuditIA. Les clés Google Places, PageSpeed et Bing Webmaster sont transmises à la fonction serveur sécurisée ; elles ne sont jamais affichées après enregistrement.</p>
      <fieldset class="ds-api-group"><legend>Services utilisés par les audits</legend><div class="ds-api-grid">${primary}</div></fieldset>
      <fieldset class="ds-api-group"><legend>Autres intégrations</legend><p class="ds-hint">Ces connecteurs sont conservés dans vos réglages. Une clé enregistrée ne signifie pas que l’intégration est déjà activée dans le moteur d’audit.</p><div class="ds-api-grid">${other}</div></fieldset>
      <fieldset class="ds-api-group"><legend>Propriétés et informations complémentaires</legend><div class="ds-fgrid">${fields}</div></fieldset>
      ${note}${notice}${actions}
    </form>`,
  });
}

function brandCard(s) {
  if (s.status === 'loading' || s.status === 'idle') return spinnerCard('Chargement des réglages…');
  if (s.status === 'error' && !s.draft) return errorCard({ title: 'Réglages indisponibles', text: s.notice ? s.notice.text : '', attrs: 'data-settings-reload' });
  const groups = [['Marque', ['app_name', 'company_name', 'tagline']], ['Coordonnées', ['contact_email', 'phone', 'website', 'address']], ['Signature des rapports', ['signature_name', 'signature_role', 'signature_text']], ['Couleurs', ['primary_color', 'accent_color']]];
  const byKey = Object.fromEntries(EDITABLE.map(f => [f.key, f]));
  const sections = groups.map(([t, keys]) => `<fieldset class="ds-fset"><legend>${t}</legend><div class="ds-fgrid">${keys.map(k => field(byKey[k], s)).join('')}</div></fieldset>`).join('');
  const msgs = [];
  if (s.status === 'absent') msgs.push('<p class="ds-msg ds-msg--warn">Aucun réglage enregistré pour ce compte : les valeurs par défaut sont affichées. Elles seront créées à votre premier enregistrement.</p>');
  if (!s.canEdit) msgs.push('<p class="ds-msg ds-msg--warn">Lecture seule : seul le compte administrateur peut modifier les réglages.</p>');
  if (s.notice) msgs.push(`<p class="ds-msg ds-msg--${s.notice.kind === 'ok' ? 'ok' : 'error'}" role="${s.notice.kind === 'ok' ? 'status' : 'alert'}">${escHtml(s.notice.text)}</p>`);
  const meta = s.updatedAt ? `<p class="ds-hint">Dernier enregistrement : ${escHtml(fmt(s.updatedAt))}.</p>` : '';
  const actions = s.canEdit
    ? `<div class="ds-savebar"><button type="button" class="ds-btn" data-settings-cancel ${s.dirty ? '' : 'hidden'}>Annuler</button><button type="submit" class="ds-btn ds-btn--primary" data-settings-save ${!s.dirty || s.saving ? 'disabled' : ''}>${s.saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>` : '';
  return card({
    title: 'Marque et signature',
    body: `<form data-settings-form novalidate>${msgs.join('')}${sections}${meta}<p class="ds-hint">Le logo se modifie dans l’ancienne interface. Ces réglages sont partagés avec elle.</p>${actions}</form>`,
  });
}

export function settingsView(s, user) {
  return `<div class="ds-settings"><div class="ds-settings__side">${accountCard(user)}</div><div class="ds-settings__main">${brandCard(s)}${servicesCard(s)}</div></div>`;
}
