/* AuditIA — Studio IA : appel de la fonction Edge Supabase « claude-assist » (la clé Anthropic reste côté serveur).
   Le corps de la fonction est identique à celui de index.html ; seule différence : le client Supabase est passé en paramètre
   (getClient) au lieu d'être lu dans l'état global de l'interface. index.html garde un petit adaptateur claudeAssist(). */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../core/config.js';

export async function claudeAssistWith(getClient, system, prompt, maxTokens){
  const client=await getClient();
  const {data}=await client.auth.getSession();
  const token=data&&data.session&&data.session.access_token;
  if(!token) throw new Error('session expirée, reconnecte-toi.');
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),45000);
  try{
    const r=await fetch(SUPABASE_URL+'/functions/v1/claude-assist',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({system,prompt,maxTokens}),signal:ctrl.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||('erreur '+r.status));
    if(!d.text) throw new Error('réponse vide.');
    return d;
  }catch(e){
    if(e.name==='AbortError') throw new Error('délai dépassé, réessaie.');
    throw e;
  }finally{ clearTimeout(timer); }
}
