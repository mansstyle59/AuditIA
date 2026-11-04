// AuditIA — service d'authentification (logique pure, client Supabase injecté).
// Reprend les règles de l'ancienne interface : accès réservé à ADMIN_EMAIL, blocage après
// 5 échecs (60 s), messages d'erreur identiques, message neutre pour « mot de passe oublié ».
import { ADMIN_EMAIL } from '../core/config.js';
import { authError, pwdIssue, validEmail } from '../core/auth-helpers.js';

export const NOT_ALLOWED = 'Ce compte n’est pas autorisé à accéder à AuditIA.';
export const FORGOT_OK = 'Si un compte existe avec cette adresse, un e-mail vient d’être envoyé. Pensez à regarder dans les indésirables.';
export const GENERIC_FAIL = 'Connexion impossible.';

// Lecture d'un lien de connexion / réinitialisation (hash ou query), comme l'ancien boot().
export function parseAuthLink(hash, search) {
  const hp = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const qp = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  return {
    type: hp.get('type') || qp.get('type') || '',
    error: hp.get('error_code') || qp.get('error_code') || hp.get('error') || qp.get('error') || '',
    dirty: /access_token|refresh_token|error|type=/.test(String(hash || '') + String(search || '')),
  };
}

export function createAuthService({ getClient, adminEmail = ADMIN_EMAIL, redirectUrl, now = () => Date.now() }) {
  let fails = 0;
  let lockUntil = 0;

  async function quietSignOut() {
    try { const sb = await getClient(); await sb.auth.signOut(); } catch (e) { /* déjà déconnecté */ }
  }

  // Un compte n'est accepté que s'il est l'administrateur : sinon on referme la session.
  async function acceptUser(user) {
    if (!user || String(user.email || '').toLowerCase() !== adminEmail) {
      await quietSignOut();
      return { ok: false, message: NOT_ALLOWED };
    }
    return { ok: true, user };
  }

  async function signIn(emailRaw, password) {
    const email = String(emailRaw || '').trim().toLowerCase();
    if (now() < lockUntil) return { ok: false, message: 'Trop d’essais. Réessayez dans ' + Math.ceil((lockUntil - now()) / 1000) + ' secondes.' };
    if (!validEmail(email)) return { ok: false, message: 'Saisissez une adresse e-mail valide.' };
    if (!password) return { ok: false, message: 'Saisissez votre mot de passe.' };
    let result;
    try {
      const sb = await getClient();
      result = await sb.auth.signInWithPassword({ email, password });
    } catch (err) {
      result = { data: null, error: err || new Error('network') };
    }
    const { data, error } = result;
    if (error) {
      fails++;
      if (fails >= 5) { lockUntil = now() + 60000; fails = 0; }
      return { ok: false, message: authError(error) };
    }
    if (email !== adminEmail) { await quietSignOut(); return { ok: false, message: NOT_ALLOWED }; }
    fails = 0;
    return acceptUser(data && data.user);
  }

  // Lit la session enregistrée (attend aussi le traitement d'un éventuel lien dans l'URL).
  async function peekSession() {
    try {
      const sb = await getClient();
      const { data } = await sb.auth.getSession();
      return (data && data.session) || null;
    } catch (e) { return null; }
  }

  async function restoreSession() {
    const session = await peekSession();
    if (session && session.user) return acceptUser(session.user);
    return { ok: false, message: '' };
  }

  async function sendReset(emailRaw) {
    const email = String(emailRaw || '').trim().toLowerCase();
    if (!validEmail(email)) return { ok: false, message: 'Saisissez une adresse e-mail valide.' };
    let error = null;
    try {
      const sb = await getClient();
      ({ error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }));
    } catch (err) { error = err || new Error('network'); }
    // Quota dépassé ou réseau coupé : on le dit. Sinon message neutre (n'indique pas si le compte existe).
    if (error && (error.status === 429 || /rate|fetch|network/i.test(error.message || ''))) return { ok: false, message: authError(error) };
    return { ok: true, message: FORGOT_OK };
  }

  async function setNewPassword(password, confirm) {
    const issue = pwdIssue(password);
    if (issue) return { ok: false, message: 'Mot de passe trop faible : ' + issue };
    if (password !== confirm) return { ok: false, message: 'Les deux mots de passe ne sont pas identiques.' };
    let error = null;
    try {
      const sb = await getClient();
      ({ error } = await sb.auth.updateUser({ password }));
    } catch (err) { error = err || new Error('network'); }
    if (error) return { ok: false, message: authError(error) };
    try {
      const sb = await getClient();
      const { data } = await sb.auth.getUser();
      if (data && data.user) {
        const accepted = await acceptUser(data.user);
        return accepted.ok ? { ok: true, user: accepted.user, message: 'Mot de passe modifié.' } : accepted;
      }
    } catch (e) { /* retour à la connexion ci-dessous */ }
    return { ok: true, user: null, message: 'Mot de passe modifié. Vous pouvez vous connecter.' };
  }

  async function signOut() {
    try { localStorage.removeItem('auditia.keystatus'); } catch (e) { /* stockage indisponible */ }
    try { const sb = await getClient(); await sb.auth.signOut(); } catch (e) { /* on repasse de toute façon à l'écran de connexion */ }
  }

  async function watch(onRecovery, onSignedOut) {
    const sb = await getClient();
    sb.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') onRecovery();
      else if (event === 'SIGNED_OUT') onSignedOut();
    });
  }

  return { signIn, peekSession, acceptUser, restoreSession, sendReset, setNewPassword, signOut, watch };
}
