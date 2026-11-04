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
      const name=String((c&&c.name)||'').trim(); if(!name) return {matched:false};
      const city=String((c&&c.city)||'').trim();
      const url='https://recherche-entreprises.api.gouv.fr/search?q='+encodeURIComponent((name+' '+city).trim())+'&page=1&per_page=1';
      let data=null;
      try{ const r=await withTimeout(fetch(url),12000); if(r.ok) data=await r.json(); }catch(e){}
      if(!data){ try{ const r2=await withTimeout(fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url)),15000); if(r2.ok) data=await r2.json(); }catch(e){} }
      const res=data&&data.results&&data.results[0]; if(!res) return {matched:false};
      const siege=res.siege||{};
      const dir=(res.dirigeants&&res.dirigeants[0])||null;
      const dirName=dir?((dir.nom||dir.nom_patronymique)?((dir.prenoms||dir.prenom||'')+' '+(dir.nom||dir.nom_patronymique)).replace(/\s+/g,' ').trim():(dir.denomination||'')):'';
      return { matched:true, siren:res.siren||'', siret:siege.siret||'',
        denomination:res.nom_complet||res.nom_raison_sociale||'',
        dateCreation:siege.date_creation||res.date_creation||'',
        naf:res.activite_principale||siege.activite_principale||'',
        nafSection:res.section_activite_principale||'',
        formeJuridique:res.nature_juridique||'',
        dirigeant:dirName, etablissements:res.nombre_etablissements||null,
        ville:siege.libelle_commune||'', codePostal:siege.code_postal||'',
        fetchedAt:new Date().toISOString() };
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
