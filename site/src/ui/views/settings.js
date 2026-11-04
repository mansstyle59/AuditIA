// AuditIA — LOT 6 : écran Réglages (profil, marque, services). Même vue en HTML ; la mise en page mobile / ordinateur est faite en CSS.
import { card, btn, badge, spinnerCard, errorCard } from '../components/ui.js';
import { accountCard } from './account.js';
import { escHtml } from '../../core/utils.js';
import { EDITABLE, SERVICES, OTHER_KEYS, serviceStatus } from '../../settings/settings-model.js';

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

function servicesCard(s) {
  const rows = SERVICES.map(svc => {
    const st = serviceStatus(svc, s.masks);
    return `<li class="ds-svc"><div class="ds-svc__main"><b>${escHtml(svc.label)}</b><span>${escHtml(svc.role)}</span><small>${escHtml(st.detail)}</small></div>${badge(st.label, st.tone)}</li>`;
  }).join('');
  const others = s.masks ? OTHER_KEYS.filter(o => s.masks[o.column] && s.masks[o.column].present).map(o => o.label) : [];
  const note = others.length
    ? `<p class="ds-hint">Clés présentes mais non utilisées par la nouvelle interface : ${escHtml(others.join(', '))}.</p>` : '';
  return card({
    title: 'Services et clés API',
    body: `<ul class="ds-svcs">${rows}</ul>${note}
      <p class="ds-hint">Les clés ne sont jamais affichées en entier et ne se modifient pas ici : utilisez l’ancienne interface. Aucun test réel n’est lancé depuis cet écran (il pourrait consommer un quota) : « Clé renseignée » signifie seulement qu’une valeur existe.</p>`,
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
  return `<div class="ds-settings"><div class="ds-settings__side">${accountCard(user)}${servicesCard(s)}</div><div class="ds-settings__main">${brandCard(s)}</div></div>`;
}
