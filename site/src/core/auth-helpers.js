/* AuditIA — aides de connexion pures (validation e-mail / mot de passe, messages d'erreur Supabase Auth).
   Déplacé tel quel depuis site/index.html (étape 2). */
export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export const pwdIssue = p => p.length<8 ? '8 caractères minimum.' : (!/[A-Za-zÀ-ÿ]/.test(p)||!/\d/.test(p)) ? 'au moins une lettre et un chiffre.' : p.length>72 ? '72 caractères maximum.' : '';

export function authError(e){
      const m=((e&&(e.message||e.error_description))||'').toLowerCase(), st=e&&e.status;
      if(st===429||m.includes('rate limit')||m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
      if(m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
      if(m.includes('email not confirmed')) return 'Votre adresse e-mail n’est pas encore confirmée. Ouvrez le lien reçu par e-mail.';
      if(m.includes('same password')||m.includes('different from the old')) return 'Choisissez un mot de passe différent de l’ancien.';
      if(m.includes('password')&&(m.includes('weak')||m.includes('at least')||m.includes('should'))) return 'Mot de passe trop faible : 8 caractères minimum, avec au moins une lettre et un chiffre.';
      if(m.includes('fetch')||m.includes('network')) return 'Connexion impossible. Vérifiez votre réseau internet.';
      return 'Une erreur est survenue. Réessayez.';
    }
