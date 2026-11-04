// AuditIA — carte « Compte » (LOT 6) : adresse connectée, rôle réel et déconnexion.
import { btn, card, badge } from '../components/ui.js';
import { escHtml } from '../../core/utils.js';
import { isAdminUser } from '../../settings/settings-model.js';

const fmtDate = iso => { try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }); } catch (e) { return ''; } };

export function accountCard(user) {
  const email = user && user.email ? user.email : '';
  const admin = isAdminUser(user);
  const last = user && user.last_sign_in_at ? fmtDate(user.last_sign_in_at) : '';
  const body = `<p class="ds-row__meta">Connecté en tant que</p>
    <p class="ds-account__mail">${escHtml(email)}</p>
    <dl class="ds-kv">
      <div><dt>Rôle</dt><dd>${badge(admin ? 'Administrateur' : 'Lecture seule', admin ? 'good' : 'warn')}</dd></div>
      ${last ? `<div><dt>Dernière connexion</dt><dd>${escHtml(last)}</dd></div>` : ''}
    </dl>
    <p class="ds-hint">L’adresse e-mail est gérée par le système de connexion. AuditIA utilise un accès administrateur unique : aucun droit n’est modifié depuis cet écran.</p>
    ${btn({ label: 'Se déconnecter', block: true, attrs: 'data-logout' })}`;
  return card({ title: 'Compte', body });
}
