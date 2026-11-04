// AuditIA — vue « Compte » : adresse connectée et déconnexion.
// Le profil complet et les paramètres seront branchés au lot 6.
import { btn, card } from '../components/ui.js';
import { escHtml } from '../../core/utils.js';

export function accountView(user) {
  const email = user && user.email ? user.email : '';
  const body = `<p class="ds-row__meta">Connecté en tant que</p>
    <p class="ds-account__mail">${escHtml(email)}</p>
    ${btn({ label: 'Se déconnecter', block: true, attrs: 'data-logout' })}`;
  return card({ title: 'Compte', body });
}
