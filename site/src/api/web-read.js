/* AuditIA — lecture de sources web publiques : page d'un site (via r.jina.ai / allorigins), robots.txt et llms.txt,
   ancienneté du domaine (RDAP), informations légales (SIRENE), capture d'écran (mShots).
   Fonctions asynchrones qui ne dépendent d'aucun état de l'interface (entrées en paramètres, résultat renvoyé).
   Déplacées telles quelles depuis site/index.html (étape 2) : mêmes adresses, mêmes délais maximum, mêmes secours. */
import { safeHttpUrl, withTimeout } from '../core/utils.js';
import { AI_BOTS, parseRobotsForAI } from '../audit/site-analysis.js';

export async function fetchDomainDate(website){
      try{
        const host=new URL(/^https?:\/\//i.test(website)?website:'https://'+website).hostname.replace(/^www\./,'');
        const r=await withTimeout(fetch('https://rdap.org/domain/'+encodeURIComponent(host)),9000);
        if(!r.ok) return null;
        const d=await r.json();
        const ev=(d.events||[]).find(e=>/registration/i.test(e.eventAction||''));
        return ev?ev.eventDate:null;
      }catch(e){ return null; }
    }

export async function fetchSirene(c){
  const name=String((c&&c.name)||'').trim();
  if(!name) return {matched:false,reason:'Nom du commerce absent'};
  const city=String((c&&c.city)||'').trim();
  const details=(c&&c.details)||{};
  const address=String(details.address||(c&&c.address)||'').trim();
  const postal=(address.match(/\\b\\d{5}\\b/)||[])[0]||'';
  const queries=[...new Set([
    [name,postal,city].filter(Boolean).join(' '),
    [name,city].filter(Boolean).join(' '),
    name
  ])];
  const all=[];
  for(const q of queries){
    const url='https://recherche-entreprises.api.gouv.fr/search?q='+encodeURIComponent(q)+'&page=1&per_page=10';
    let data=null;
    try{const r=await withTimeout(fetch(url),10000);if(r.ok)data=await r.json();}catch(e){}
    if(!data){try{const r=await withTimeout(fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url)),12000);if(r.ok)data=await r.json();}catch(e){}}
    (data&&Array.isArray(data.results)?data.results:[]).forEach(x=>{if(x&&x.siren&&!all.some(y=>String(y.siren)===String(x.siren)))all.push(x);});
    if(all.length>=20) break;
  }
  const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const target=norm(name), targetCity=norm(city), targetPostal=postal;
  const scored=all.map(res=>{
    const siege=res.siege||{};
    const legal=norm([res.nom_complet,res.nom_raison_sociale].filter(Boolean).join(' '));
    const town=norm(siege.libelle_commune||'');
    const cp=String(siege.code_postal||'');
    let score=0;
    if(legal===target) score+=65;
    else if(legal.includes(target)||target.includes(legal)) score+=40;
    if(targetCity&&town===targetCity) score+=20;
    else if(targetCity&&town&& (town.includes(targetCity)||targetCity.includes(town))) score+=10;
    if(targetPostal&&cp===targetPostal) score+=30;
    const addr=norm([siege.numero_voie,siege.type_voie,siege.libelle_voie].filter(Boolean).join(' '));
    const wanted=norm(address);
    if(wanted&&addr&&wanted.includes(addr)) score+=10;
    return {res,siege,score};
  }).sort((a,b)=>b.score-a.score);
  const best=scored[0];
  if(!best||best.score<55) return {matched:false,reason:all.length?'Correspondances insuffisamment fiables':'Aucun résultat dans le registre',candidates:all.length,fetchedAt:new Date().toISOString()};
  const {res,siege,score}=best;
  const dir=(res.dirigeants&&res.dirigeants[0])||null;
  const dirName=dir?((dir.nom||dir.nom_patronymique)?((dir.prenoms||dir.prenom||'')+' '+(dir.nom||dir.nom_patronymique)).replace(/\\s+/g,' ').trim():(dir.denomination||'')):'';
  return {matched:true,matchScore:score,matchConfidence:score>=85?'élevée':score>=65?'moyenne':'à vérifier',
    siren:res.siren||'',siret:siege.siret||'',denomination:res.nom_complet||res.nom_raison_sociale||'',
    dateCreation:siege.date_creation||res.date_creation||'',naf:res.activite_principale||siege.activite_principale||'',
    nafSection:res.section_activite_principale||'',formeJuridique:res.nature_juridique||'',dirigeant:dirName,
    etablissements:res.nombre_etablissements||null,ville:siege.libelle_commune||'',codePostal:siege.code_postal||'',
    adresse:[siege.numero_voie,siege.type_voie,siege.libelle_voie].filter(Boolean).join(' '),etatAdministratif:siege.etat_administratif||'',
    fetchedAt:new Date().toISOString()};
}

export async function readSiteText(url,opts,timeout){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout||40000);try{const r=await fetch(url,{...(opts||{}),signal:ctl.signal});if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;throw e;}return await r.text();}finally{clearTimeout(t);}}

export async function fetchGeoFiles(site){
      let origin;try{origin=new URL(site).origin;}catch(e){return null;}
      const get=async path=>{try{const t=await readSiteText('https://api.allorigins.win/raw?url='+encodeURIComponent(origin+path),{},12000);return typeof t==='string'?t:null;}catch(e){return null;}};
      const [rb,ll]=await Promise.all([get('/robots.txt'),get('/llms.txt')]);
      const looksHtml=t=>/^\s*</.test(t||'')||/<html|<body/i.test(t||'');
      const robots=rb==null?null:(looksHtml(rb)||!/user-agent/i.test(rb)?{read:true,blocked:[],total:AI_BOTS.length,missing:true}:parseRobotsForAI(rb));
      const llms=ll==null?null:(!looksHtml(ll)&&ll.trim().length>40);
      return {robots,llms};
    }

export async function readSiteHtml(url){
      url=safeHttpUrl(url); if(!url) throw new Error('adresse non autorisée');
      const tries=[()=>readSiteText('https://r.jina.ai/'+url,{headers:{'X-Return-Format':'html','X-Timeout':'25'}},45000),()=>readSiteText('https://api.allorigins.win/raw?url='+encodeURIComponent(url),{},30000)];
      let last;for(const f of tries){try{const t=await f();if(t&&t.length>200&&/<(html|head|body)[\s>]/i.test(t))return t;last=new Error('page vide ou illisible');}catch(e){last=e;}}
      throw last||new Error('page illisible');
    }

export async function fetchScreenshot(site){
      site=safeHttpUrl(site); if(!site) return null;
      const svc='https://s.wordpress.com/mshots/v1/'+encodeURIComponent(site)+'?w=1000&h=750';
      for(let i=0;i<3;i++){
        try{
          const r=await withTimeout(fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(svc)),22000);
          if(r.ok){ const blob=await r.blob(); if(blob && blob.size>9000 && /image\//.test(blob.type||'image/jpeg')){ const d=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(blob);}); if(d) return d; } }
        }catch(e){}
        await new Promise(r=>setTimeout(r,4000));
      }
      return null;
    }
