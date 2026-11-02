/* AuditIA — O.C.A. (Organisation commerciale & acquisition) */
const OCA_KEY = userId => 'auditia.oca.v2:' + String(userId || 'local');
const OCA_LEGACY_KEY = userId => 'auditia.oca.v1:' + String(userId || 'local');
const OCA_STAGES = [
  ['À qualifier','À qualifier'],['À contacter','À contacter'],['Contacté','Contacté'],
  ['Relance','Relance'],['Rendez-vous','Rendez-vous'],['Devis envoyé','Devis envoyé'],
  ['Gagné','Gagné'],['Perdu','Perdu'],['Ne plus contacter','Ne plus contacter']
];
const OCA_TERMINAL_STAGES = ['Gagné','Perdu','Ne plus contacter'];
const OCA_CONTACT_STAGES = ['Contacté','Relance','Rendez-vous','Devis envoyé'];
const OCA_SERVICES = ['Audit de visibilité locale','Site vitrine','Référencement local','Automatisation IA','Maintenance web','Création de contenus','Autre prestation'];
const OCA_DEFAULT = { leads:[], avatar:{niche:'Commerces locaux, artisans et indépendants',problem:'Manque de visibilité, site vieillissant ou présence numérique incohérente',budget:'À qualifier',decision:'Dirigeant ou responsable du commerce',area:'Narbonne et alentours'}, offers:[
  {name:'Audit de visibilité locale',price:'',description:'Diagnostic documenté, priorités et plan d’action.'},
  {name:'Site vitrine professionnel',price:'',description:'Site responsive, informations essentielles et prise de contact.'},
  {name:'Accompagnement visibilité & IA',price:'',description:'SEO local, contenus et automatisations adaptées.'}
], notes:'',updatedAt:''};
const ocaEsc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ocaNormalize(data){
 const d=data&&typeof data==='object'?data:{};
 return {...structuredClone(OCA_DEFAULT),...d,leads:Array.isArray(d.leads)?d.leads:[],offers:Array.isArray(d.offers)?d.offers:structuredClone(OCA_DEFAULT.offers),avatar:{...OCA_DEFAULT.avatar,...(d.avatar||{})},notes:String(d.notes||''),updatedAt:String(d.updatedAt||'')};
}
function ocaReadLocal(userId){
 try{
  let raw=localStorage.getItem(OCA_KEY(userId)),legacy=false;
  if(!raw){raw=localStorage.getItem(OCA_LEGACY_KEY(userId));legacy=!!raw;}
  return raw?{data:ocaNormalize(JSON.parse(raw)),exists:true,legacy}:{data:ocaNormalize(null),exists:false,legacy:false};
 }catch(e){return {data:ocaNormalize(null),exists:false,legacy:false};}
}
function ocaLoad(userId){return ocaReadLocal(userId).data;}
function ocaWriteCache(userId,data){
 try{localStorage.setItem(OCA_KEY(userId),JSON.stringify(ocaNormalize(data)));localStorage.removeItem(OCA_LEGACY_KEY(userId));return true;}catch(e){return false;}
}
function ocaSave(userId,data){
 try{const next=ocaNormalize(data);next.updatedAt=new Date().toISOString();localStorage.setItem(OCA_KEY(userId),JSON.stringify(next));localStorage.removeItem(OCA_LEGACY_KEY(userId));return next;}catch(e){return null;}
}
function ocaSyncState(userId,state,message){
 const key=String(userId||'local');
 window.__ocaSyncStates=window.__ocaSyncStates||{};
 window.__ocaSyncStates[key]={state,message:message||'',at:Date.now()};
 const labels={pending:'Synchronisation…',synced:'Cloud synchronisé',local:'Sauvegarde locale',offline:'Hors ligne · données locales',error:'Cloud indisponible · données locales'};
 document.querySelectorAll('[data-oca-sync-status]').forEach(el=>{if(el.dataset.ocaSyncUser!==key)return;el.dataset.state=state;el.textContent=labels[state]||'O.C.A.';el.title=message||labels[state]||'État de synchronisation';});
}
function ocaSyncBadge(userId){
 const key=String(userId||'local'),st=(window.__ocaSyncStates||{})[key],state=st?st.state:(key==='local'?'local':'pending');
 const labels={pending:'Synchronisation…',synced:'Cloud synchronisé',local:'Sauvegarde locale',offline:'Hors ligne · données locales',error:'Cloud indisponible · données locales'};
 return '<span class="oca-sync-status" data-oca-sync-status data-oca-sync-user="'+ocaEsc(key)+'" data-state="'+ocaEsc(state)+'" title="'+ocaEsc(st&&st.message||labels[state]||'')+'">'+ocaEsc(labels[state]||'O.C.A.')+'</span>';
}
async function ocaCloudWrite(userId,supabase,data){
 const payload=ocaNormalize(data);
 if(!payload.updatedAt)payload.updatedAt=new Date().toISOString();
 const {error}=await supabase.from('oca_workspaces').upsert({user_id:userId,data:payload,updated_at:payload.updatedAt},{onConflict:'user_id'});
 if(error)throw error;
 return payload;
}
function ocaQueueCloudSave(userId,supabase,data){
 const key=String(userId||'local');
 if(!supabase||!userId||key==='local'){ocaSyncState(key,'local','Compte connecté indisponible : O.C.A. reste enregistré sur cet appareil.');return;}
 if(typeof navigator!=='undefined'&&navigator.onLine===false){ocaSyncState(key,'offline','Modifications conservées localement. Elles seront synchronisées au retour du réseau.');return;}
 window.__ocaCloudTimers=window.__ocaCloudTimers||{};
 if(window.__ocaCloudTimers[key])clearTimeout(window.__ocaCloudTimers[key]);
 ocaSyncState(key,'pending','Enregistrement de tes modifications dans Supabase.');
 window.__ocaCloudTimers[key]=setTimeout(async()=>{
  try{await ocaCloudWrite(key,supabase,data);ocaSyncState(key,'synced','Prospects, offres et suivi enregistrés dans ton espace cloud.');window.__ocaSyncAt=window.__ocaSyncAt||{};window.__ocaSyncAt[key]=Date.now();}
  catch(e){ocaSyncState(key,'error','Sauvegarde locale conservée. Vérifie la connexion puis rouvre O.C.A. pour réessayer.');}
  delete window.__ocaCloudTimers[key];
 },500);
}
async function ocaSyncCloud(userId,supabase,onChange){
 const key=String(userId||'local');
 if(!supabase||!userId||key==='local'){ocaSyncState(key,'local','O.C.A. fonctionne en mode local pour cette session.');return;}
 window.__ocaSyncPromises=window.__ocaSyncPromises||{};
 if(window.__ocaSyncPromises[key])return window.__ocaSyncPromises[key];
 window.__ocaSyncAt=window.__ocaSyncAt||{};
 if(Date.now()-(window.__ocaSyncAt[key]||0)<20000)return;
 const task=(async()=>{
  let dataChanged=false;
  ocaSyncState(key,'pending','Récupération du dernier espace O.C.A. sauvegardé.');
  try{
   const {data:row,error}=await supabase.from('oca_workspaces').select('data,updated_at').eq('user_id',key).maybeSingle();
   if(error)throw error;
   const local=ocaReadLocal(key);
   if(row){
    const remote=ocaNormalize(row.data);
    remote.updatedAt=remote.updatedAt||row.updated_at||'';
    const localTime=Date.parse(local.data.updatedAt||'')||0;
    const remoteTime=Date.parse(row.updated_at||remote.updatedAt||'')||0;
    if(!local.exists||remoteTime>=localTime){
     if(!ocaWriteCache(key,remote))throw new Error('Stockage local indisponible');
     dataChanged=true;
     ocaSyncState(key,'synced','Données cloud récupérées et mises en cache sur cet appareil.');
    }else{
     const localData=local.legacy?ocaSave(key,local.data):local.data;
     if(!localData)throw new Error('Stockage local indisponible');
     await ocaCloudWrite(key,supabase,localData);
     ocaSyncState(key,'synced','Anciennes données locales transférées vers le cloud.');
    }
   }else if(local.exists){
    const localData=local.legacy||!local.data.updatedAt?ocaSave(key,local.data):local.data;
    if(!localData)throw new Error('Stockage local indisponible');
    await ocaCloudWrite(key,supabase,localData);
    ocaSyncState(key,'synced','Données O.C.A. existantes transférées vers le cloud.');
   }else{
    ocaSyncState(key,'synced','Espace cloud prêt. Les prochaines modifications seront synchronisées.');
   }
   window.__ocaSyncAt[key]=Date.now();
   if(dataChanged&&typeof onChange==='function')onChange();
  }catch(e){
   const offline=typeof navigator!=='undefined'&&navigator.onLine===false;
   ocaSyncState(key,offline?'offline':'error',offline?'Réseau indisponible : les données restent en local.':'Synchronisation impossible pour le moment. Les données locales sont conservées.');
  }finally{delete window.__ocaSyncPromises[key];}
 })();
 window.__ocaSyncPromises[key]=task;
 return task;
}
function ocaId(){return 'oca_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function ocaDate(v){if(!v)return 'Non planifiée';const d=new Date(v+'T12:00:00');return isNaN(d)?v:d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
function ocaToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ocaStageSelect(value,id){return '<select class="oca-stage-select" data-oca-stage="'+ocaEsc(id)+'" aria-label="Étape commerciale">'+OCA_STAGES.map(([v,l])=>'<option value="'+ocaEsc(v)+'"'+(v===value?' selected':'')+'>'+ocaEsc(l)+'</option>').join('')+'</select>'}
function ocaApplyStage(l,nextStage){
 const previous=l.stage||'À qualifier';if(previous===nextStage)return;
 const at=new Date().toISOString();l.stageHistory=Array.isArray(l.stageHistory)?l.stageHistory:[];
 l.stageHistory.unshift({from:previous,to:nextStage,at});l.stageHistory=l.stageHistory.slice(0,40);
 l.stage=nextStage;l.stageChangedAt=at;
 if(OCA_CONTACT_STAGES.includes(nextStage)){l.lastContactAt=at;}
 if(nextStage==='Gagné'){l.wonAt=at;l.nextDate='';}
 if(nextStage==='Perdu'||nextStage==='Ne plus contacter'){l.closedAt=at;l.nextDate='';}
}
function ocaDueText(l){
 if(!l.nextDate)return 'Aucune relance planifiée';
 if(l.nextDate<ocaToday())return 'En retard · '+ocaDate(l.nextDate);
 if(l.nextDate===ocaToday())return 'À traiter aujourd’hui';
 return 'À venir · '+ocaDate(l.nextDate);
}
function ocaActivityLabel(a){
 if(a.type==='contact')return 'Contact effectué'+(a.channel&&a.channel!=='manual'?' · '+a.channel:'');
 if(a.type==='draft')return 'Brouillon créé · '+String(a.channel||'message');
 if(a.type==='stage')return 'Étape : '+String(a.from||'')+' → '+String(a.to||'');
 return 'Action commerciale';
}
function ocaActivityDate(v){
 if(!v)return '';
 const d=new Date(v);return isNaN(d)?'':d.toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}
function ocaLeadName(l){return [l.name,l.city].filter(Boolean).join(' · ')}
function ocaLeadEditCard(l){
 const stage=l.stage||'À qualifier';
 return '<article class="oca-lead-card oca-lead-editing"><div class="oca-lead-top"><div class="oca-lead-avatar">'+ocaEsc((l.name||'?').trim().charAt(0).toUpperCase())+'</div><div class="oca-lead-main"><b>Modifier le prospect</b><span>'+ocaEsc(ocaLeadName(l))+'</span></div></div><form class="oca-form oca-edit-form" data-oca-edit-form data-oca-edit-id="'+ocaEsc(l.id)+'"><div class="oca-form-grid"><label>Nom du commerce<input name="name" required maxlength="140" value="'+ocaEsc(l.name||'')+'"></label><label>Ville<input name="city" maxlength="100" value="'+ocaEsc(l.city||'')+'"></label><label>Catégorie<input name="category" maxlength="100" value="'+ocaEsc(l.category||'')+'"></label><label>Étape commerciale<select name="stage">'+OCA_STAGES.map(([v])=>'<option value="'+ocaEsc(v)+'"'+(v===stage?' selected':'')+'>'+ocaEsc(v)+'</option>').join('')+'</select></label><label>Site web<input name="website" type="text" value="'+ocaEsc(l.website||'')+'" placeholder="https://…"></label><label>E-mail<input name="email" type="email" value="'+ocaEsc(l.email||'')+'"></label><label>Téléphone<input name="phone" type="tel" value="'+ocaEsc(l.phone||'')+'"></label><label>Prestation<select name="service">'+OCA_SERVICES.map(v=>'<option value="'+ocaEsc(v)+'"'+(v===(l.service||'')?' selected':'')+'>'+ocaEsc(v)+'</option>').join('')+'</select></label><label>Valeur estimée (€)<input name="value" type="number" min="0" step="50" value="'+ocaEsc(l.value||'')+'"></label><label>Prochaine relance<input name="nextDate" type="date" value="'+ocaEsc(l.nextDate||'')+'"></label><label>Prochaine action<input name="nextAction" maxlength="180" value="'+ocaEsc(l.nextAction||'')+'" placeholder="Ex. Appeler le gérant"></label><label>Motif de perte / arrêt<input name="lostReason" maxlength="220" value="'+ocaEsc(l.lostReason||'')+'" placeholder="Facultatif"></label><label class="oca-wide">Notes<textarea name="notes" rows="3">'+ocaEsc(l.notes||'')+'</textarea></label></div><div class="oca-lead-controls"><button class="app-btn primary" type="submit">Enregistrer les modifications</button><button class="oca-btn" type="button" data-oca-cancel-edit>Annuler</button></div></form></article>';
}
function ocaLeadCard(l){
 if(window.__ocaEditLeadId===l.id)return ocaLeadEditCard(l);
 const stage=l.stage||'À qualifier';
 const score=l.auditScore==null?'Audit non réalisé':'AuditIA '+l.auditScore+'/100';
 const closed=OCA_TERMINAL_STAGES.includes(stage);
 const date=ocaDueText(l);
 const dueClass=l.nextDate&&l.nextDate<ocaToday()&&!closed?' is-overdue':l.nextDate===ocaToday()&&!closed?' is-due-today':'';
 const contactDate=l.lastContactAt?new Date(l.lastContactAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'Jamais contacté';
 const searchable=[l.name,l.city,l.category,l.notes,l.email,l.phone,l.website,l.source,l.service,l.nextAction].join(' ').toLowerCase();
 return '<article class="oca-lead-card'+(closed?' is-closed':'')+'" data-oca-search-text="'+ocaEsc(searchable)+'"><div class="oca-lead-top"><div class="oca-lead-avatar">'+ocaEsc((l.name||'?').trim().charAt(0).toUpperCase())+'</div><div class="oca-lead-main"><b>'+ocaEsc(l.name||'Prospect sans nom')+'</b><span>'+ocaEsc([l.city,l.category].filter(Boolean).join(' · ')||'Informations à compléter')+'</span><small>'+ocaEsc(score)+' · '+ocaEsc(l.source||'Ajout manuel')+'</small></div><span class="oca-stage-badge">'+ocaEsc(stage)+'</span></div>'+(l.website?'<a class="oca-link" href="'+ocaEsc(/^https?:\/\//i.test(l.website)?l.website:'https://'+l.website)+'" target="_blank" rel="noopener noreferrer">'+ocaEsc(l.website)+'</a>':'')+'<div class="oca-lead-meta">'+(l.email?'<span>✉ '+ocaEsc(l.email)+'</span>':'')+(l.phone?'<span>☎ '+ocaEsc(l.phone)+'</span>':'')+'<span class="oca-due'+dueClass+'">Relance : '+ocaEsc(date)+'</span>'+(l.nextAction?'<span>Action : '+ocaEsc(l.nextAction)+'</span>':'')+'<span>Dernier contact : '+ocaEsc(contactDate)+'</span>'+(l.value?'<span>Valeur : '+ocaEsc(l.value)+' €</span>':'')+'</div><div class="oca-lead-controls">'+ocaStageSelect(stage,l.id)+'<button type="button" class="oca-btn" data-oca-contact="'+ocaEsc(l.id)+'" '+(closed?'disabled':'')+'>Contact effectué</button><button type="button" class="oca-btn" data-oca-edit="'+ocaEsc(l.id)+'">Modifier</button><button type="button" class="oca-btn" data-oca-script-for="'+ocaEsc(l.id)+'" '+(closed?'disabled':'')+'>Préparer un message</button>'+(l.auditId?'<button type="button" class="oca-btn" data-oca-open-audit="'+ocaEsc(l.auditId)+'">Ouvrir l’audit</button>':'')+'<button type="button" class="oca-btn oca-danger" data-oca-delete="'+ocaEsc(l.id)+'">Supprimer</button></div>'+(l.notes?'<p class="oca-lead-notes">'+ocaEsc(l.notes)+'</p>':'')+(Array.isArray(l.activities)&&l.activities.length?'<details class="oca-history"><summary>Historique ('+l.activities.length+')</summary>'+l.activities.slice(0,5).map(a=>'<div><b>'+ocaEsc(ocaActivityLabel(a))+'</b><small>'+ocaEsc(ocaActivityDate(a.at))+'</small></div>').join('')+'</details>':'')+'</article>';
}
function renderOCAView(ctx={}){
 const userId=ctx.userId||'local', d=ocaLoad(userId), leads=d.leads, tab=window.__ocaTab||'dashboard';
 const active=leads.filter(l=>!OCA_TERMINAL_STAGES.includes(l.stage||'À qualifier'));
 const won=leads.filter(l=>l.stage==='Gagné'), lost=leads.filter(l=>l.stage==='Perdu'), optedOut=leads.filter(l=>l.stage==='Ne plus contacter');
 const contacted=leads.filter(l=>OCA_CONTACT_STAGES.includes(l.stage));
 const follow=active.filter(l=>l.nextDate&&l.nextDate<=ocaToday()).sort((a,b)=>String(a.nextDate).localeCompare(String(b.nextDate)));
 const value=won.reduce((s,l)=>s+(Number(String(l.value||'').replace(',','.'))||0),0);
 const pipelineValue=active.reduce((s,l)=>s+(Number(String(l.value||'').replace(',','.'))||0),0);
 const closed=won.length+lost.length, conversion=closed?Math.round(won.length/closed*100):0;
 const tabs=[['dashboard','Vue d’ensemble'],['leads','Prospects'],['avatar','Cible & offre'],['scripts','Messages'],['method','Méthode']];
 const nav='<div class="oca-tabs" role="tablist">'+tabs.map(([k,v])=>'<button type="button" role="tab" aria-selected="'+(tab===k)+'" class="'+(tab===k?'active':'')+'" data-oca-tab="'+k+'">'+v+'</button>').join('')+'</div>';
 const leadForm='<details class="oca-add" '+(tab==='leads'?'open':'')+'><summary>＋ Ajouter un prospect</summary><form class="oca-form" data-oca-create><div class="oca-form-grid"><label>Nom du commerce / prospect<input name="name" required maxlength="140" placeholder="Ex. Boulangerie du Centre"></label><label>Ville<input name="city" maxlength="100" placeholder="Narbonne"></label><label>Catégorie<input name="category" maxlength="100" placeholder="Restaurant, artisan…"></label><label>Site web<input name="website" type="text" placeholder="https://…"></label><label>E-mail<input name="email" type="email" placeholder="contact@…"></label><label>Téléphone<input name="phone" type="tel"></label><label>Source<select name="source"><option>Ajout manuel</option><option>AuditIA</option><option>Recommandation</option><option>LinkedIn</option><option>Google Maps</option><option>Autre</option></select></label><label>Prestation envisagée<select name="service">'+OCA_SERVICES.map(x=>'<option>'+ocaEsc(x)+'</option>').join('')+'</select></label><label>Valeur potentielle (€)<input name="value" type="number" min="0" step="50" placeholder="À définir"></label><label>Prochaine action<input name="nextAction" maxlength="180" placeholder="Ex. Vérifier la fiche Google"></label><label>Prochaine relance<input name="nextDate" type="date" min="'+ocaToday()+'"></label><label class="oca-wide">Notes<textarea name="notes" rows="3" placeholder="Besoin observé, contexte, prochaine action…"></textarea></label></div><button class="app-btn primary" type="submit">Enregistrer le prospect</button></form></details>';
 const importForm=(ctx.clients||[]).length?'<section class="oca-panel"><h3>Importer un commerce déjà dans AuditIA</h3><p>Reprends un dossier existant dans le pipeline commercial sans recréer sa fiche client.</p><form class="oca-form oca-import-form" data-oca-import><label>Commerce<select name="clientId">'+ctx.clients.map(c=>'<option value="'+ocaEsc(c.id)+'">'+ocaEsc([c.name,c.city].filter(Boolean).join(' · '))+'</option>').join('')+'</select></label><button class="app-btn" type="submit">Importer dans O.C.A.</button></form></section>':'';
 let body='';
 if(tab==='dashboard'){
   body='<div class="oca-hero"><div class="oca-kicker">AFFIADS · SYSTÈME O.C.A.</div><h2>De l’audit au <span>client signé.</span></h2><p>Un processus commercial suivi de bout en bout : qualification, contact, relance, rendez-vous, devis et décision. Chaque chiffre provient de tes prospects enregistrés.</p><div class="oca-hero-actions"><button class="app-btn primary" data-oca-tab="leads">＋ Ajouter un prospect</button><button class="app-btn" data-oca-tab="avatar">Définir ma cible</button></div></div><div class="oca-kpis"><article><span>Prospects actifs</span><b>'+active.length+'</b><small>À qualifier ou en cours</small></article><article><span>Relances dues</span><b>'+follow.length+'</b><small>En retard ou aujourd’hui</small></article><article><span>Contacts engagés</span><b>'+contacted.length+'</b><small>Contactés à devis envoyé</small></article><article><span>Rendez-vous</span><b>'+leads.filter(l=>l.stage==='Rendez-vous').length+'</b><small>À convertir en proposition</small></article><article><span>Devis envoyés</span><b>'+leads.filter(l=>l.stage==='Devis envoyé').length+'</b><small>Décision à suivre</small></article><article><span>Clients gagnés</span><b>'+won.length+'</b><small>Conversion clôturée : '+conversion+' %</small></article><article><span>Valeur du pipeline</span><b>'+pipelineValue.toLocaleString('fr-FR')+' €</b><small>Potentiel estimé, non garanti</small></article><article><span>Valeur signée</span><b>'+value.toLocaleString('fr-FR')+' €</b><small>Montants renseignés sur les clients gagnés</small></article></div><div class="oca-two-col"><section class="oca-panel"><div class="oca-panel-head"><div><span class="oca-kicker">À FAIRE MAINTENANT</span><h3>Relances à traiter</h3></div><span class="oca-count">'+follow.length+'</span></div>'+(follow.length?follow.slice(0,6).map(l=>'<div class="oca-follow-row"><div><b>'+ocaEsc(l.name)+'</b><small>'+ocaEsc(l.city||'')+' · '+ocaEsc(ocaDueText(l))+(l.nextAction?' · '+ocaEsc(l.nextAction):'')+'</small></div><button class="oca-btn" data-oca-script-for="'+ocaEsc(l.id)+'">Préparer</button></div>').join(''):'<div class="oca-empty">Aucune relance en retard ou prévue aujourd’hui. Ajoute une date et une action à tes prospects pour créer une vraie liste de travail.</div>')+'</section><section class="oca-panel"><span class="oca-kicker">PIPELINE</span><h3>Avancement commercial</h3>'+OCA_STAGES.slice(0,6).map(([stage])=>{const n=leads.filter(l=>l.stage===stage).length;return '<div class="oca-pipeline-row"><span>'+ocaEsc(stage)+'</span><b>'+n+'</b><i><em style="width:'+Math.min(100,leads.length?n/leads.length*100:0)+'%"></em></i></div>'}).join('')+'<div class="oca-outcome-summary"><span>Gagnés <b>'+won.length+'</b></span><span>Perdus <b>'+lost.length+'</b></span><span>Ne plus contacter <b>'+optedOut.length+'</b></span></div></section></div>'+leadForm+importForm+'<section class="oca-panel"><div class="oca-panel-head"><div><span class="oca-kicker">DERNIERS DOSSIERS</span><h3>Prospects récents</h3></div><button class="oca-btn" data-oca-tab="leads">Voir tout</button></div>'+(leads.length?leads.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,4).map(ocaLeadCard).join(''):'<div class="oca-empty">Ton pipeline est vide. Importe un commerce d’AuditIA ou ajoute un prospect pour démarrer.</div>')+'</section>';
 }else if(tab==='leads'){
   body='<div class="oca-section-title"><div><span class="oca-kicker">PIPELINE COMMERCIAL</span><h2>Mes prospects</h2><p>Chaque prospect doit avoir une prochaine action claire.</p></div><button class="oca-btn" data-oca-export>Exporter mes données</button></div>'+leadForm+importForm+'<section class="oca-panel"><div class="oca-filter-row"><input data-oca-search placeholder="Rechercher nom, ville, besoin…" aria-label="Rechercher prospect"><select data-oca-filter-stage><option value="">Toutes les étapes</option>'+OCA_STAGES.map(([s])=>'<option>'+ocaEsc(s)+'</option>').join('')+'</select></div><div data-oca-lead-list>'+ (leads.length?leads.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).map(ocaLeadCard).join(''):'<div class="oca-empty">Aucun prospect pour le moment.</div>')+'</div></section>';
 }else if(tab==='avatar'){
   body='<div class="oca-section-title"><div><span class="oca-kicker">POSITIONNEMENT</span><h2>Client idéal & offres</h2><p>Une cible claire évite les messages génériques et les prestations mal cadrées.</p></div></div><section class="oca-panel"><h3>Mon client idéal</h3><form class="oca-form" data-oca-avatar><label>Clientèle cible<input name="niche" value="'+ocaEsc(d.avatar.niche)+'" maxlength="220"></label><label>Problème concret<input name="problem" value="'+ocaEsc(d.avatar.problem)+'" maxlength="300"></label><label>Budget / capacité à investir<input name="budget" value="'+ocaEsc(d.avatar.budget)+'" maxlength="160"></label><label>Décideur<input name="decision" value="'+ocaEsc(d.avatar.decision)+'" maxlength="160"></label><label>Zone géographique<input name="area" value="'+ocaEsc(d.avatar.area)+'" maxlength="160"></label><button class="app-btn primary" type="submit">Enregistrer ma cible</button></form></section><section class="oca-panel"><div class="oca-panel-head"><div><h3>Mes offres AffiAds</h3><p>Renseigne les tarifs réels avant de les proposer. Aucun prix n’est inventé.</p></div></div><form class="oca-form" data-oca-offers>'+d.offers.map((o,i)=>'<div class="oca-offer-edit"><label>Nom de l’offre<input name="name_'+i+'" value="'+ocaEsc(o.name)+'" maxlength="120"></label><label>Tarif (€)<input name="price_'+i+'" type="number" min="0" step="50" value="'+ocaEsc(o.price||'')+'" placeholder="À définir"></label><label>Description<textarea name="description_'+i+'" rows="2">'+ocaEsc(o.description||'')+'</textarea></label></div>').join('')+'<button class="app-btn primary" type="submit">Enregistrer mes offres</button></form></section>';
 }else if(tab==='scripts'){
   const options=leads.filter(l=>!OCA_TERMINAL_STAGES.includes(l.stage||'À qualifier')).map(l=>'<option value="'+ocaEsc(l.id)+'"'+(window.__ocaSelectedLead===l.id?' selected':'')+'>'+ocaEsc(ocaLeadName(l))+'</option>').join('');
   body='<div class="oca-section-title"><div><span class="oca-kicker">PROSPECTION PERSONNALISÉE</span><h2>Messages prêts à adapter</h2><p>Messages courts, honnêtes et personnalisés à partir des informations enregistrées.</p></div></div><section class="oca-panel"><form class="oca-form" data-oca-message><label>Prospect<select name="leadId">'+(options||'<option value="">Ajoute d’abord un prospect</option>')+'</select></label><label>Canal<select name="channel"><option value="email">E-mail</option><option value="linkedin">LinkedIn</option><option value="followup">Relance</option><option value="sms">SMS</option><option value="call">Trame d’appel</option></select></label><label>Objectif<select name="goal"><option value="audit">Proposer un mini-diagnostic</option><option value="website">Présenter une création de site</option><option value="meeting">Obtenir un échange de 15 minutes</option><option value="follow">Relancer après un premier contact</option></select></label><button class="app-btn primary" type="submit">Générer le brouillon</button></form><div class="oca-message-output" data-oca-message-output><div class="oca-empty">Sélectionne un prospect puis génère un brouillon. Relis-le avant de l’envoyer.</div></div><div class="oca-output-actions"><button class="app-btn" data-oca-copy disabled>Copier le message</button><button class="app-btn" data-oca-save-message disabled>Ajouter une note au prospect</button></div></section><section class="oca-panel"><h3>Principes de prospection</h3><ul class="oca-check-list"><li>Une observation réelle, pas une critique fabriquée.</li><li>Une seule proposition concrète par message.</li><li>Pas de promesse de clients, de chiffre d’affaires ou de classement Google.</li><li>Respecte les règles applicables à la prospection et les demandes de non-contact.</li></ul></section>';
 }else{
   body='<div class="oca-section-title"><div><span class="oca-kicker">PROCESSUS</span><h2>La méthode O.C.A.</h2><p>Un processus répétable, pas une promesse de résultats garantis.</p></div></div><div class="oca-method-grid">'+[['O — Observer','Repérer un commerce pertinent. Utiliser AuditIA pour identifier des faits vérifiables : site, fiche locale, informations incohérentes ou axes d’amélioration.','Ne contacte pas une entreprise avec un défaut inventé.'],['C — Cadrer','Qualifier le besoin, le décideur, le budget, le calendrier et la prestation qui apporte une vraie valeur.','Si le besoin n’est pas clair, ne pousse pas un devis.'],['A — Accompagner','Envoyer une proposition personnalisée, planifier une relance raisonnable et suivre la décision.','Un prospect qui refuse ou demande l’arrêt doit sortir de la séquence.']].map(([t,p,n])=>'<article class="oca-method-card"><span class="oca-method-num">'+t.charAt(0)+'</span><h3>'+t+'</h3><p>'+p+'</p><small>'+n+'</small></article>').join('')+'</div><section class="oca-panel"><h3>Mon plan d’action hebdomadaire</h3><div class="oca-week-plan"><div><b>1. Recherche</b><span>10 prospects pertinents, pas une liste massive.</span></div><div><b>2. Qualification</b><span>Vérifier les faits et choisir une offre cohérente.</span></div><div><b>3. Contact</b><span>Messages individualisés, suivis manuellement.</span></div><div><b>4. Relance</b><span>Une relance utile, puis respecter le silence ou le refus.</span></div><div><b>5. Bilan</b><span>Mesurer réponses, rendez-vous, devis et ventes.</span></div></div></section><section class="oca-panel"><h3>Notes commerciales</h3><form class="oca-form" data-oca-notes><textarea name="notes" rows="5" placeholder="Objectifs de la semaine, objections, prochaines améliorations…">'+ocaEsc(d.notes||'')+'</textarea><button class="app-btn primary" type="submit">Enregistrer mes notes</button></form><div class="oca-backup-actions"><button class="oca-btn" data-oca-export>Exporter mes données O.C.A.</button><label class="oca-btn oca-file-label">Importer une sauvegarde<input type="file" accept="application/json,.json" data-oca-import-file hidden></label><button class="oca-btn oca-danger" data-oca-reset>Réinitialiser O.C.A.</button></div><p class="oca-storage-note">Les données O.C.A. sont synchronisées dans Supabase pour ton compte, avec une copie locale de secours. L’accès est limité à ton utilisateur. Garde aussi une sauvegarde JSON de temps en temps.</p></section>';
 }
 return '<div class="oca-root">'+ocaSyncBadge(userId)+nav+body+'</div>';
}
function ocaMakeMessage(lead,channel,goal,data){
 if(!lead)return 'Sélectionne un prospect actif avant de préparer un message.';
 if(OCA_TERMINAL_STAGES.includes(lead.stage))return 'Ce prospect est clôturé ou a demandé à ne plus être contacté. Aucun message ne doit être préparé.';
 const city=lead.city?(' à '+lead.city):'',service=lead.service||'une prestation adaptée';
 const offer=(data.offers||[]).find(o=>String(o.name||'').toLowerCase().includes(goal==='website'?'site':goal==='audit'?'audit':'') )||(data.offers||[])[0];
 const contact=lead.name||'votre établissement';
 const observation=lead.auditScore!=null?'Le dossier AuditIA de '+contact+' affiche un score de visibilité de '+lead.auditScore+'/100. Ce score est un indicateur, pas une garantie de performance.':'Je travaille avec les commerces locaux sur leur visibilité numérique ; je ne présume pas de vos besoins sans en discuter.';
 const value=offer?.name||service;
 const price=offer?.price?(' (tarif indicatif renseigné : '+offer.price+' €)'):'';
 if(channel==='sms') return 'Bonjour, je suis Denis d’AffiAds. J’accompagne les commerces'+city+' sur leur visibilité numérique. '+(goal==='meeting'?'Seriez-vous disponible pour un échange de 15 minutes ?':'Je souhaitais vous proposer un échange court autour de '+value+'.')+' Si ce n’est pas pertinent, aucun souci.';
 if(channel==='call') return 'TRAME D’APPEL — '+contact+'\n\n1. Bonjour, je suis Denis d’AffiAds. Est-ce que je peux vous prendre 30 secondes ?\n2. Motif : '+observation+'\n3. Question : aujourd’hui, votre priorité est plutôt d’attirer plus de demandes, d’améliorer votre site ou de gagner du temps ?\n4. Proposition : '+value+price+' — à préciser selon le besoin réel.\n5. Conclusion : proposer un échange de 15 minutes, sans insister en cas de refus.';
 if(channel==='linkedin') return 'Bonjour,\n\nJe suis Denis, d’AffiAds. J’accompagne les commerces et indépendants sur leur visibilité web et leurs outils numériques.\n\n'+(goal==='follow'?'Je me permets de revenir vers vous suite à mon précédent message.':goal==='meeting'?'Seriez-vous ouvert à un échange de 15 minutes pour comprendre vos priorités ?':'Je serais intéressé de comprendre vos priorités actuelles en matière de visibilité numérique.')+'\n\nSi le sujet vous intéresse, pouvons-nous échanger quelques minutes ?\n\nBonne journée,\nDenis · AffiAds';
 if(goal==='follow') return 'Objet : Suite à mon message — AffiAds\n\nBonjour,\n\nJe me permets une courte relance au sujet de mon précédent message concernant '+value+'.\n\nSi ce sujet n’est pas prioritaire pour vous, aucun problème. Dans le cas contraire, je peux vous proposer un échange de 15 minutes pour comprendre vos besoins et voir si je peux vous être utile.\n\nBonne journée,\nDenis\nAffiAds';
 if(goal==='meeting') return 'Objet : Proposition d’un échange de 15 minutes — AffiAds\n\nBonjour,\n\nJe suis Denis d’AffiAds. J’accompagne les commerces locaux sur leur visibilité numérique et leurs outils web.\n\nJe ne veux pas présumer de vos besoins : l’idée serait simplement de comprendre vos priorités et de voir si je peux vous apporter quelque chose de concret.\n\nSeriez-vous disponible pour un échange de 15 minutes, à votre convenance ?\n\nBonne journée,\nDenis · AffiAds';
 if(goal==='website') return 'Objet : Votre présence en ligne'+city+' — AffiAds\n\nBonjour,\n\nJe suis Denis d’AffiAds. J’accompagne les commerces dans la création et l’amélioration de leur présence numérique.\n\nJe voulais vous proposer un échange autour d’un site vitrine professionnel, adapté aux mobiles et conçu pour faciliter les prises de contact. Le périmètre et le tarif seraient définis après avoir compris vos besoins'+(price?'. L’offre enregistrée dans mon espace est '+value+price:'')+'.\n\nSeriez-vous disponible pour un échange de 15 minutes ?\n\nBonne journée,\nDenis · AffiAds';
 return 'Objet : Une piste pour la visibilité de '+contact+' — AffiAds\n\nBonjour,\n\nJe suis Denis d’AffiAds et j’accompagne les commerces locaux sur leur visibilité numérique.\n\n'+observation+'\n\nJe peux vous proposer un mini-diagnostic et vous présenter quelques pistes d’amélioration concrètes, sans engagement. Si cela vous intéresse, seriez-vous disponible pour un échange de 15 minutes ?\n\nBonne journée,\nDenis\nAffiAds';
}
function bindOCAEvents(page,ctx={}){
 const userId=ctx.userId||'local';
 const rerender=()=>{if(typeof ctx.render==='function')ctx.render();};
 const setNotice=message=>{if(typeof ctx.setNotice==='function')ctx.setNotice(message);};
 const getData=()=>ocaLoad(userId);
 const save=d=>{const stored=ocaSave(userId,d);if(!stored){setNotice('Impossible d’enregistrer : stockage local indisponible. Exporte tes données puis libère de l’espace.');ocaSyncState(userId,'error','Échec de la sauvegarde locale.');return false;}ocaQueueCloudSave(userId,ctx.supabase,stored);return true;};
 if(page.querySelector('.oca-root'))ocaSyncCloud(userId,ctx.supabase,()=>{if(page.isConnected)rerender();});
 page.querySelectorAll('[data-oca-tab]').forEach(b=>b.addEventListener('click',()=>{window.__ocaTab=b.dataset.ocaTab||'dashboard';rerender();}));
 const create=page.querySelector('[data-oca-create]');
 if(create)create.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(create),d=getData(),name=String(fd.get('name')||'').trim();if(!name)return;const now=new Date().toISOString();d.leads.unshift({id:ocaId(),name,city:String(fd.get('city')||'').trim(),category:String(fd.get('category')||'').trim(),website:String(fd.get('website')||'').trim(),email:String(fd.get('email')||'').trim(),phone:String(fd.get('phone')||'').trim(),source:String(fd.get('source')||'Ajout manuel'),service:String(fd.get('service')||''),value:String(fd.get('value')||''),nextDate:String(fd.get('nextDate')||''),nextAction:String(fd.get('nextAction')||'').trim(),notes:String(fd.get('notes')||'').trim(),stage:'À qualifier',stageHistory:[],activities:[],createdAt:now,updatedAt:now});if(!save(d)){renderApp();return;}window.__ocaTab='leads';setNotice('Prospect ajouté au pipeline O.C.A.');renderApp();});
 const imp=page.querySelector('[data-oca-import]');
 if(imp)imp.addEventListener('submit',e=>{e.preventDefault();const cid=String(new FormData(imp).get('clientId')||''),c=(ctx.clients||[]).find(x=>String(x.id)===cid);if(!c)return;const d=getData();if(d.leads.some(l=>String(l.auditClientId)===cid)){setNotice('Ce commerce est déjà importé dans O.C.A.');renderApp();return;}const audits=(ctx.audits||[]).filter(a=>String(a.client_id)===cid).sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')));const a=audits.find(x=>x.site||x.scan||x.status==='Analysé');const hasScore=!!a&&(Number(a.score)>0||['Analysé','Terminé','Complété'].includes(a.status));const now=new Date().toISOString();d.leads.unshift({id:ocaId(),auditClientId:cid,auditId:a?.id||'',auditStatus:a?.status||'',name:c.name||'Commerce',city:c.city||'',category:c.category||(c.details||{}).category||'',website:c.website||'',email:'',phone:c.phone||'',source:'AuditIA',service:'Audit de visibilité locale',value:'',nextDate:'',nextAction:'Qualifier le besoin et vérifier le diagnostic',notes:'Importé depuis AuditIA. À qualifier avant contact.',stage:'À qualifier',stageHistory:[],activities:[],auditScore:hasScore?Number(a.score):null,createdAt:now,updatedAt:now});if(!save(d)){renderApp();return;}setNotice('Commerce importé dans O.C.A. ; le dossier AuditIA reste inchangé.');renderApp();});
 const avatar=page.querySelector('[data-oca-avatar]');
 if(avatar)avatar.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(avatar),d=getData();d.avatar={niche:String(fd.get('niche')||''),problem:String(fd.get('problem')||''),budget:String(fd.get('budget')||''),decision:String(fd.get('decision')||''),area:String(fd.get('area')||'')};save(d);setNotice('Cible commerciale enregistrée.');renderApp();});
 const offers=page.querySelector('[data-oca-offers]');
 if(offers)offers.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(offers),d=getData();d.offers=d.offers.map((o,i)=>({...o,name:String(fd.get('name_'+i)||'').trim(),price:String(fd.get('price_'+i)||''),description:String(fd.get('description_'+i)||'').trim()}));save(d);setNotice('Offres AffiAds enregistrées.');renderApp();});
 const notes=page.querySelector('[data-oca-notes]');
 if(notes)notes.addEventListener('submit',e=>{e.preventDefault();const d=getData();d.notes=String(new FormData(notes).get('notes')||'');save(d);setNotice('Notes commerciales enregistrées.');renderApp();});
 page.querySelectorAll('[data-oca-stage]').forEach(sel=>sel.addEventListener('change',()=>{const d=getData(),l=d.leads.find(x=>x.id===sel.dataset.ocaStage);if(l){const previous=l.stage||'À qualifier';ocaApplyStage(l,sel.value);l.activities=Array.isArray(l.activities)?l.activities:[];l.activities.unshift({type:'stage',from:previous,to:l.stage,at:new Date().toISOString()});l.updatedAt=new Date().toISOString();if(!save(d)){renderApp();return;}setNotice('Étape commerciale mise à jour.');renderApp();}}));
 page.querySelectorAll('[data-oca-contact]').forEach(b=>b.addEventListener('click',()=>{const d=getData(),l=d.leads.find(x=>x.id===b.dataset.ocaContact);if(!l||OCA_TERMINAL_STAGES.includes(l.stage))return;const now=new Date().toISOString();l.lastContactAt=now;l.activities=Array.isArray(l.activities)?l.activities:[];l.activities.unshift({type:'contact',at:now,channel:'manual'});if(['À qualifier','À contacter'].includes(l.stage||'À qualifier'))ocaApplyStage(l,'Contacté');l.updatedAt=now;if(!save(d)){renderApp();return;}setNotice('Contact enregistré dans l’historique du prospect. Pense à planifier la prochaine action.');renderApp();}));
 page.querySelectorAll('[data-oca-delete]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('Supprimer ce prospect du pipeline O.C.A. ?'))return;const d=getData();d.leads=d.leads.filter(l=>l.id!==b.dataset.ocaDelete);if(!save(d)){renderApp();return;}setNotice('Prospect supprimé.');renderApp();}));
 page.querySelectorAll('[data-oca-script-for]').forEach(b=>b.addEventListener('click',()=>{window.__ocaSelectedLead=b.dataset.ocaScriptFor;window.__ocaTab='scripts';renderApp();}));
 page.querySelectorAll('[data-oca-edit]').forEach(b=>b.addEventListener('click',()=>{window.__ocaEditLeadId=b.dataset.ocaEdit;renderApp();}));
 page.querySelectorAll('[data-oca-cancel-edit]').forEach(b=>b.addEventListener('click',()=>{window.__ocaEditLeadId=null;renderApp();}));
 page.querySelectorAll('[data-oca-edit-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(form),d=getData(),l=d.leads.find(x=>x.id===form.dataset.ocaEditId);if(!l)return;const now=new Date().toISOString(),nextStage=String(fd.get('stage')||l.stage||'À qualifier'),previous=l.stage||'À qualifier';if(nextStage!==previous){ocaApplyStage(l,nextStage);l.activities=Array.isArray(l.activities)?l.activities:[];l.activities.unshift({type:'stage',from:previous,to:nextStage,at:now});}['name','city','category','website','email','phone','service','value','nextDate','nextAction','lostReason','notes'].forEach(k=>{l[k]=String(fd.get(k)||'').trim();});l.updatedAt=now;if(!save(d)){renderApp();return;}window.__ocaEditLeadId=null;setNotice('Fiche prospect mise à jour.');renderApp();}));
 page.querySelectorAll('[data-oca-open-audit]').forEach(b=>b.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('auditia:oca-open-audit',{detail:{auditId:b.dataset.ocaOpenAudit}}));}));
 let currentMessage='';
 let currentMessageMeta={leadId:'',channel:'email',goal:'audit'};
 const msgForm=page.querySelector('[data-oca-message]');
 if(msgForm)msgForm.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(msgForm),d=getData(),l=d.leads.find(x=>x.id===String(fd.get('leadId')||'')),channel=String(fd.get('channel')||'email'),goal=String(fd.get('goal')||'audit');if(!l||OCA_TERMINAL_STAGES.includes(l.stage)){currentMessage='Sélectionne un prospect actif. Les prospects clôturés ou ayant demandé l’arrêt ne peuvent pas être contactés.';page.querySelector('[data-oca-copy]')?.setAttribute('disabled','');page.querySelector('[data-oca-save-message]')?.setAttribute('disabled','');}else{currentMessage=ocaMakeMessage(l,channel,goal,d);currentMessageMeta={leadId:l.id,channel,goal};page.querySelector('[data-oca-copy]')?.removeAttribute('disabled');page.querySelector('[data-oca-save-message]')?.removeAttribute('disabled');}const out=page.querySelector('[data-oca-message-output]');if(out)out.innerHTML='<textarea class="oca-message-text" data-oca-message-text rows="14" aria-label="Brouillon à relire">'+ocaEsc(currentMessage)+'</textarea><p class="oca-storage-note">Brouillon généré localement. Vérifie les faits, adapte le ton et respecte les préférences de contact. Rien n’est envoyé automatiquement.</p>';});
 page.querySelector('[data-oca-copy]')?.addEventListener('click',async()=>{const text=page.querySelector('[data-oca-message-text]')?.value||currentMessage;if(!text)return;try{await navigator.clipboard.writeText(text);const b=page.querySelector('[data-oca-copy]');if(b)b.textContent='Copié ✓';}catch(e){const b=page.querySelector('[data-oca-copy]');if(b)b.textContent='Sélectionne le texte pour copier';}});
 page.querySelector('[data-oca-save-message]')?.addEventListener('click',()=>{const d=getData(),l=d.leads.find(x=>x.id===currentMessageMeta.leadId);if(!l||OCA_TERMINAL_STAGES.includes(l.stage))return;const txt=page.querySelector('[data-oca-message-text]')?.value||currentMessage,now=new Date().toISOString();l.notes=(l.notes?l.notes+'\n\n':'')+'Brouillon commercial ('+new Date().toLocaleDateString('fr-FR')+'):\n'+txt;l.activities=Array.isArray(l.activities)?l.activities:[];l.activities.unshift({type:'draft',channel:currentMessageMeta.channel,goal:currentMessageMeta.goal,at:now});l.updatedAt=now;if(!save(d)){renderApp();return;}setNotice('Brouillon ajouté aux notes et à l’historique du prospect.');renderApp();});
 page.querySelectorAll('[data-oca-export]').forEach(b=>b.addEventListener('click',()=>{const data=getData(),blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AffiAds-OCA-sauvegarde-'+ocaToday()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}));
 const file=page.querySelector('[data-oca-import-file]');
 if(file)file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text()),data=parsed.data||parsed;if(!Array.isArray(data.leads)||!Array.isArray(data.offers))throw new Error('Format invalide');if(!confirm('Remplacer les données O.C.A. locales par cette sauvegarde ?'))return;save({...structuredClone(OCA_DEFAULT),...data});setNotice('Sauvegarde O.C.A. importée.');renderApp();}catch(e){setNotice('Import refusé : fichier JSON O.C.A. invalide.');renderApp();}});
 page.querySelector('[data-oca-reset]')?.addEventListener('click',()=>{if(!confirm('Effacer toutes les données locales O.C.A. de ce navigateur ? Cette action ne supprime pas les clients ni les audits AuditIA.'))return;save(structuredClone(OCA_DEFAULT));setNotice('O.C.A. réinitialisé.');renderApp();});
 const search=page.querySelector('[data-oca-search]'),filter=page.querySelector('[data-oca-filter-stage]');
 const applyFilter=()=>{const q=String(search?.value||'').toLowerCase().trim(),stage=String(filter?.value||''),list=page.querySelector('[data-oca-lead-list]');if(!list)return;let visible=0;list.querySelectorAll('.oca-lead-card').forEach(card=>{const ok=(!stage||card.querySelector('[data-oca-stage]')?.value===stage)&&(!q||String(card.dataset.ocaSearchText||'').includes(q));card.hidden=!ok;if(ok)visible++;});let empty=list.querySelector('.oca-filter-empty');if(!empty){empty.hidden=visible>0;}else if(!visible){empty=document.createElement('div');empty.className='oca-empty oca-filter-empty';empty.textContent='Aucun prospect ne correspond à ce filtre.';list.appendChild(empty);}};
 if(search)search.addEventListener('input',applyFilter);if(filter)filter.addEventListener('change',applyFilter);
}

/* Expose the isolated module to the existing authenticated app shell. */
window.renderOCAView = renderOCAView;
window.bindOCAEvents = bindOCAEvents;
