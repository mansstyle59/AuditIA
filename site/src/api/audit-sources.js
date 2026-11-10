/* AuditIA — sources de l'analyse complète qui interrogent des services externes :
   recherche web (DuckDuckGo via relais), présence web (réseaux, annuaires), photos de la fiche Google,
   concurrents locaux (Google Places), classement sur les mots-clés, PageSpeed (Lighthouse mobile).
   Code repris à l'identique de l'ancienne interface (site/index.html, fonctions fetchSerp, findWebPresence,
   fetchPlacePhotos, fetchCompetitors, checkRankings, fetchPagespeed) : mêmes adresses, mêmes corps de requête,
   mêmes délais, mêmes secours. Seules les variables globales de l'ancienne page sont remplacées par des
   dépendances injectées (clés lues en lecture seule, rappels de progression).
   Les 5 autres sources (site, SIRENE, âge du domaine, capture, robots.txt/llms.txt) sont dans web-read.js. */
import { safeHttpUrl, norm, siteHost } from '../core/utils.js';
import { secureApi } from './secure-api.js';
import { placePhotoCount } from './places.js';
import { SOCIAL_RX, businessInUrl } from '../audit/site-analysis.js';
import { targetKeywords } from '../audit/scoring.js';
import { readSiteText } from './web-read.js';

export function createAuditSources(deps0){
  const deps=Object.assign({
    getClient:()=>null,
    onSearch:()=>{}, onFact:()=>{}
  },deps0||{});
  const serpMemo=new Map();
      const DIRECTORY_RX=[['Pages Jaunes',/pagesjaunes\.fr/],['Google Maps',/(maps\.google\.|goo\.gl\/maps|g\.page)/],['TripAdvisor',/tripadvisor\./],['TheFork',/(thefork\.|lafourchette\.)/],['Yelp',/yelp\./],['Mappy',/mappy\./],['Petit Futé',/petitfute\./],['Justacôté',/justacote\./],['Cylex',/cylex/],['Foursquare',/foursquare\./],['Booking',/booking\.com/],['Uber Eats',/ubereats\./],['Deliveroo',/deliveroo\./],['Planity',/planity\./],['Doctolib',/doctolib\./],['Treatwell',/treatwell\./],['Resy',/resy\./]];
      async function fetchSerp(query){
        const cacheKey=String(query||'').trim().toLowerCase();
              if(cacheKey&&serpMemo.has(cacheKey)) return serpMemo.get(cacheKey);
        const job=fetchSerpUncached(query);
        if(cacheKey) serpMemo.set(cacheKey, job);
        return job;
      }
      async function fetchSerpUncached(query){
        const target='https://html.duckduckgo.com/html/?q='+encodeURIComponent(query);
        const tries=[
          'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
          'https://corsproxy.io/?url='+encodeURIComponent(target),
          'https://r.jina.ai/'+target,
          'https://r.jina.ai/https://lite.duckduckgo.com/lite/?q='+encodeURIComponent(query)
        ];
        const dec=h=>{ const m=String(h||'').match(/[?&]uddg=([^&]+)/); if(m){ try{return decodeURIComponent(m[1]);}catch(e){} } return h; };
        const parse=html=>{
          if(!html||html.length<200) return [];
          let results=[];
          try{ const doc=new DOMParser().parseFromString(html,'text/html'); results=[...doc.querySelectorAll('a.result__a')].map(a=>({title:(a.textContent||'').trim(),url:dec(a.getAttribute('href')||'')})).filter(r=>/^https?:/i.test(r.url)); }catch(e){}
          if(!results.length){ const re=/uddg=([^&"' )]+)/g; let m; const seen=new Set(); while((m=re.exec(html))){ let v; try{v=decodeURIComponent(m[1]);}catch(e){continue;} if(/^https?:/i.test(v)&&!seen.has(v)){seen.add(v);results.push({title:'',url:v});} } }
          if(results.length<8){ const md=/\[([^\]]{2,140})\]\((https?:\/\/[^)\s]+)\)/g; let mm; const seen=new Set(results.map(r=>r.url)); while((mm=md.exec(html))){ let v=mm[2]; if(/duckduckgo\.com|allorigins|corsproxy|jina\.ai/i.test(v)) continue; if(!seen.has(v)){ seen.add(v); results.push({title:(mm[1]||'').trim(),url:v}); } } }
          return results.slice(0,25);
        };
        // Try providers concurrently so one slow proxy cannot multiply the wait
        // for every keyword. Return the first usable result set, with a hard timeout.
        let timer;
        try{
          const attempts=tries.map(u=>readSiteText(u,{},7000).then(html=>{const results=parse(html); if(!results.length) throw new Error('Aucun résultat exploitable'); return results;}));
          const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Délai de recherche dépassé')),12000);});
          const found = await Promise.race([Promise.any(attempts),timeout]);
          deps.onSearch();
          return found;
        }catch(e){ deps.onSearch(); return []; }
        finally{ if(timer) clearTimeout(timer); }
      }
      async function findWebPresence(c){
        const name=String((c&&c.name)||'').trim(); if(!name) return {socials:[],directories:[]};
        const city=String((c&&c.city)||'').trim();
        const results=(await Promise.all([(name+' '+city).trim(),('"'+name+'" '+(city?city+' ':'')+'avis').trim()].filter(Boolean).map(q=>fetchSerp(q).catch(()=>[])))).flat();
        const socials=[]; const seenS=new Set(); const dirs=[]; const seenD=new Set();
        results.forEach(r=>{ let url; try{url=new URL(r.url);}catch(e){return;} if(/sharer|share\?|intent|\/login|\/policies|\/about$|\/help|\/privacy|hashtag|\/explore/i.test(url.href)) return;
          const net=SOCIAL_RX.find(([,rx])=>rx.test(url.hostname)); if(net&&url.pathname.length>1&&businessInUrl(url.href,name)&&!seenS.has(net[0])){ seenS.add(net[0]); socials.push({net:net[0],url:url.href,source:'web'}); }
          const d=DIRECTORY_RX.find(([,rx])=>rx.test(url.href)); if(d&&businessInUrl(url.href,name)&&!seenD.has(d[0])){ seenD.add(d[0]); dirs.push({name:d[0],url:url.href}); }
        });
        return {socials,directories:dirs.slice(0,8)};
      }
      /* Recherche ciblée par réseau : chaque plateforme possède sa propre ligne de progression dans l'audit. */
      async function findSocialProfile(c, network){
        const hosts={Instagram:'instagram.com',Facebook:'facebook.com',YouTube:'youtube.com',TikTok:'tiktok.com',LinkedIn:'linkedin.com'};
        const host=hosts[network]; const name=String((c&&c.name)||'').trim();
        if(!host||!name) return null;
        const city=String((c&&c.city)||'').trim();
        const query=('site:'+host+' "'+name+'" '+city).trim();
        const results=await fetchSerp(query).catch(()=>[]);
        for(const r of results){
          let u; try{u=new URL(r.url);}catch(e){continue;}
          if(!(u.hostname===host||u.hostname.endsWith('.'+host))) continue;
          if(/\/login|\/share|\/sharer|\/policies|\/privacy/i.test(u.pathname)) continue;
          if(businessInUrl(u.href,name)||businessInUrl(r.title,name)){
            return {net:network,url:u.href,source:'recherche web ciblée'};
          }
        }
        return null;
      }
      async function fetchPlacePhotos(placeId){
        if(!placeId) return null;
        try{ return await placePhotoCount(deps.getClient, placeId); }catch(e){ return null; }
      }
      /* Concurrents locaux : commerces du même type dans la ville (Google Places), classés par avis */
      async function fetchCompetitors(c){
        const d=(c&&c.details)||{}; const city=String((c&&c.city)||'').trim();
        const base=targetKeywords(c).base||String((c&&c.category)||d.category||'commerce').toLowerCase();
        const query=(base+' '+city).trim();
        try{
          const data=await secureApi(deps.getClient,{action:'places_searchText',textQuery:query,maxResultCount:20,mask:'competitors'},15000,'Google refuse la recherche des concurrents.');
          const places=data.places||[]; if(!places.length) return null;
          const selfId=d.place_id||''; const selfName=norm((c&&c.name)||'');
          const seen=new Set(); const all=[];
          places.forEach(p=>{
            const id=p.id||'', nm=(p.displayName&&p.displayName.text)||'';
            if(!nm||(id&&seen.has(id))) return; if(id) seen.add(id);
            const website=String(p.websiteUri||'').startsWith('http')?p.websiteUri:'';
            all.push({placeId:id,name:nm,rating:(typeof p.rating==='number')?p.rating:null,reviews:Number(p.userRatingCount)||0,website,primaryType:(p.primaryTypeDisplayName&&p.primaryTypeDisplayName.text)||'',businessStatus:p.businessStatus||'',mapsUrl:p.googleMapsUri||'',isSelf:(!!selfId&&id===selfId)||(!selfId&&!!selfName&&norm(nm)===selfName)});
          });
          if(selfName&&!all.some(x=>x.isSelf)&&city){
            try{
              const d2=await secureApi(deps.getClient,{action:'places_searchText',textQuery:String((c&&c.name)||'')+' '+city,maxResultCount:10,mask:'competitors'},12000,'Google refuse la recherche des concurrents.');
              { (d2.places||[]).forEach(p=>{ const id=p.id||'', nm=(p.displayName&&p.displayName.text)||''; if(!nm||(id&&seen.has(id))) return; if(id) seen.add(id); const website=String(p.websiteUri||'').startsWith('http')?p.websiteUri:''; all.push({placeId:id,name:nm,rating:(typeof p.rating==='number')?p.rating:null,reviews:Number(p.userRatingCount)||0,website,primaryType:(p.primaryTypeDisplayName&&p.primaryTypeDisplayName.text)||'',businessStatus:p.businessStatus||'',mapsUrl:p.googleMapsUri||'',isSelf:(!!selfId&&id===selfId)||(!selfId&&!!selfName&&norm(nm)===selfName)}); }); }
            }catch(e){}
          }
          all.sort((a,b)=>(b.reviews-a.reviews)||((b.rating||0)-(a.rating||0))||a.name.localeCompare(b.name,'fr'));
          all.forEach((x,i)=>x.rank=i+1);
          const self=all.find(x=>x.isSelf)||null, top=all.slice(0,8);
          if(self&&!top.some(x=>x.isSelf)){top.pop();top.push(self);top.sort((a,b)=>a.rank-b.rank);}
          const ahead=self?all.filter(x=>x.rank<self.rank).sort((a,b)=>a.rank-b.rank):[];
          const nextAhead=ahead.length?ahead[ahead.length-1]:null, rated=all.filter(x=>x.rating!=null);
          return {query,total:all.length,selfRank:self?self.rank:null,selfFound:!!self,leader:all[0]||null,nextAhead,averageRating:rated.length?rated.reduce((n,x)=>n+x.rating,0)/rated.length:null,averageReviews:all.length?Math.round(all.reduce((n,x)=>n+x.reviews,0)/all.length):0,list:top};
        }catch(e){ return null; }
      }
      /* Classement : pour chaque mot-clé client, à quelle position apparaît le commerce (recherche web réelle) */
      async function checkRankings(c){
        const nameRaw=String((c&&c.name)||'').trim(); const cityRaw=String((c&&c.city)||'').trim(); const kws=[...new Set([(nameRaw+' '+cityRaw).trim(),...targetKeywords(c).seo].filter(Boolean))].slice(0,6);
        const name=norm((c&&c.name)||''); const host=siteHost(c);
        const nameTokens=name.split(' ').filter(w=>w.length>3);
        const out=new Array(kws.length);
        let cursor=0;
        const one=async(kw,idx)=>{
          deps.onFact('Mot-clé en cours', kw, (idx+1)+' / '+kws.length);
          const results=await fetchSerp(kw);
          if(!results.length){ out[idx]={kw,pos:null,found:false,error:true}; return; }
          let pos=null, matchType='';
          for(let i=0;i<results.length&&i<20;i++){ const r=results[i]; let h=''; try{ h=new URL(r.url).hostname.replace(/^www\./,''); }catch(e){}
            const hostMatch=!!(host&&h&&(h===host||h.endsWith('.'+host)));
            const named=businessInUrl(r.url, nameRaw);
            const dirMatch=DIRECTORY_RX.some(([,rx])=>rx.test(r.url));
            if(hostMatch||named){ pos=i+1; matchType=hostMatch?'site':dirMatch?'annuaire':'nom'; break; }
          }
          out[idx]={kw,pos,found:pos!=null,matchType};
        };
        await Promise.all(Array.from({length:Math.min(3,kws.length)},async()=>{ while(cursor<kws.length){ const i=cursor++; await one(kws[i], i); } }));
        return out;
      }
      async function fetchPagespeed(site){
        site=safeHttpUrl(site); if(!site) throw new Error('adresse non autorisée');
        // Passe par le proxy serveur : la clé PageSpeed reste côté serveur. Les 4 catégories sont fixées par le serveur.
        let data;
        try{ data=await secureApi(deps.getClient,{action:'pagespeed',url:site,strategy:'mobile'},60000); }
        catch(e){ if(e&&e.status===429) throw new Error('quota PageSpeed atteint'); if(e&&e.status===400) throw new Error('adresse non analysable'); throw new Error(e&&e.message?e.message:'PageSpeed indisponible'); }
        const lh=data.lighthouseResult;
        if(!lh||!lh.categories) throw new Error('aucun résultat Lighthouse');
        const sc=k=>typeof (lh.categories[k]||{}).score==='number'?Math.round(lh.categories[k].score*100):null;
        const au=lh.audits||{}; const dv=k=>(au[k]&&au[k].displayValue)||null;
        const cleanTxt=t=>String(t||'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\s+/g,' ').trim();
        const recommendations=Object.values(au).filter(x=>x&&typeof x.score==='number'&&x.score<0.9&&x.title&&(x.scoreDisplayMode==='metricSavings'||(x.details&&x.details.type==='opportunity')||x.scoreDisplayMode==='binary'||x.scoreDisplayMode==='numeric')).sort((x,y)=>x.score-y.score).slice(0,8).map(x=>({title:cleanTxt(x.title),detail:cleanTxt(x.description),gain:x.displayValue||null,severity:x.score<0.5?'haute':'moyenne'}));
        return { provider:'Google PageSpeed Insights · Lighthouse (mobile)', analyzedAt:new Date().toISOString(), url:site, finalUrl:lh.finalDisplayedUrl||site, scores:{performance:sc('performance'),accessibility:sc('accessibility'),bestPractices:sc('best-practices'),seo:sc('seo')}, metrics:{ 'Contenu affiché (FCP)':dv('first-contentful-paint'), 'Plus grand contenu (LCP)':dv('largest-contentful-paint'), 'Interactivité (TBT)':dv('total-blocking-time'), 'Stabilité visuelle (CLS)':dv('cumulative-layout-shift'), 'Vitesse (Speed Index)':dv('speed-index') }, recommendations };
      }
  return { fetchSerp, findWebPresence, fetchPlacePhotos, fetchCompetitors, checkRankings, fetchPagespeed };
}
