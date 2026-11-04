// AuditIA — client Supabase de la nouvelle interface.
// Mêmes options que l'ancienne interface (dont storageKey 'auditia-auth') : la session est donc
// partagée entre les deux interfaces. Aucune écriture ailleurs que dans le stockage de session.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../core/config.js';

let client = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load ' + src));
    document.head.appendChild(s);
  });
}

async function getCreateClient() {
  // 1) Librairie embarquée (locale, sans serveur externe)
  if (window.supabase && window.supabase.createClient) return window.supabase.createClient;
  try {
    await loadScriptOnce('./vendor/supabase.js');
    if (window.supabase && window.supabase.createClient) return window.supabase.createClient;
  } catch (e) { /* secours ci-dessous */ }
  // 2) Secours : CDN esm.sh (comme l'ancienne interface)
  const mod = await import('https://esm.sh/@supabase/supabase-js@2.57.0');
  return mod.createClient;
}

export async function getAuthClient() {
  if (client) return client;
  const createClient = await getCreateClient();
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'auditia-auth' },
  });
  return client;
}
