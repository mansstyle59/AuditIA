/* AuditIA — analyse d'une page web (réseaux sociaux, réservation, suivi, CMS, signaux SEO/GEO).
   Fonctions pures (HTML en entrée → objet en sortie), déplacées telles quelles depuis site/index.html (étape 2). */
import { norm } from '../core/utils.js';
import { hasLocalBusinessSchema } from './schema-evidence.mjs';

export const SOCIAL_RX=[['Instagram',/(^|\.)instagram\.com$/],['Facebook',/(^|\.)facebook\.com$|(^|\.)fb\.com$/],['TikTok',/(^|\.)tiktok\.com$/],['YouTube',/(^|\.)youtube\.com$|(^|\.)youtu\.be$/],['LinkedIn',/(^|\.)linkedin\.com$/],['X / Twitter',/(^|\.)(twitter|x)\.com$/],['Pinterest',/(^|\.)pinterest\.[a-z]+$/],['Snapchat',/(^|\.)snapchat\.com$/]];

export const BOOKING_RX=/booksy|planity|treatwell|doctolib|thefork|lafourchette|zenchef|resy\.com|guestonline|covermanager|opentable|calendly|resalib|keldoc|maiia|wecasa|ubereats|deliveroo|just-?eat|simplybook|resengo/i;

export const TRACK_RX=[['Pixel Meta',/connect\.facebook\.net|fbq\(/],['Google Tag Manager',/googletagmanager\.com\/gtm|GTM-[A-Z0-9]{4,}/],['Google Analytics',/google-analytics\.com|gtag\(/],['Pixel TikTok',/analytics\.tiktok\.com|ttq\.load/]];

export const CMS_RX=[['Wix',/wix\.com|wixstatic/i],['WordPress',/wp-content|wp-includes/i],['Shopify',/cdn\.shopify|Shopify\.theme/i],['Squarespace',/squarespace/i],['Webflow',/webflow/i],['Jimdo',/jimdo/i],['PrestaShop',/prestashop/i],['Google Sites',/sites\.google/i]];

export const AI_BOTS=['GPTBot','OAI-SearchBot','ChatGPT-User','PerplexityBot','ClaudeBot','Google-Extended','Applebot-Extended','CCBot'];

export function parseRobotsForAI(txt){
      const groups=[];let cur=null;
      String(txt||'').split(/\r?\n/).forEach(line=>{const l=line.replace(/#.*/,'').trim();if(!l)return;const m=l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);if(!m)return;const k=m[1].toLowerCase(),v=m[2].trim();
        if(k==='user-agent'){if(!cur||cur.rules.length){cur={agents:[],rules:[]};groups.push(cur);}cur.agents.push(v.toLowerCase());}
        else if(cur&&(k==='disallow'||k==='allow'))cur.rules.push({k,v});});
      const rootBlocked=g=>!!g&&g.rules.some(r=>r.k==='disallow'&&r.v==='/')&&!g.rules.some(r=>r.k==='allow'&&r.v==='/');
      const star=groups.find(g=>g.agents.includes('*'));
      const blocked=AI_BOTS.filter(b=>{const g=groups.find(gr=>gr.agents.includes(b.toLowerCase()));return g?rootBlocked(g):rootBlocked(star);});
      return {read:true,blocked,total:AI_BOTS.length};
    }

export function geoFromHtml(html){
      try{const doc=new DOMParser().parseFromString(html,'text/html');const text=(doc.body&&doc.body.textContent||'').replace(/\s+/g,' ');
        const faq=/FAQPage/i.test(html)||[...doc.querySelectorAll('h1,h2,h3,h4,summary,dt')].some(h=>/faq|questions? fr[ée]quentes|vos questions/i.test(h.textContent||''));
        const lists=doc.querySelectorAll('ul li,ol li').length>=4||!!doc.querySelector('table');
        const digits=(text.match(/\b\d+(?:[.,]\d+)?\s?(?:€|%|ans|km|min|h\b)?/g)||[]).length;
        const dated=/dateModified|datePublished|article:modified_time|og:updated_time/i.test(html)||!!doc.querySelector('time[datetime]');
        return {faq,lists,digits,dated};}catch(e){return {};}
    }

export function analyzeSite(html,pageUrl){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const base=(()=>{try{return new URL(pageUrl);}catch(e){return null;}})();
      const links=[...doc.querySelectorAll('a[href]')].map(a=>({href:(a.getAttribute('href')||'').trim(),text:(a.textContent||'').replace(/\s+/g,' ').trim()}));
      const socials=[];const seen=new Set();
      links.forEach(l=>{let u;try{u=new URL(l.href,base||undefined);}catch(e){return;}if(/sharer|share\?|intent\/tweet|\/share$/i.test(u.href))return;const s=SOCIAL_RX.find(([,rx])=>rx.test(u.hostname));if(s&&!seen.has(s[0])&&u.pathname.length>1){seen.add(s[0]);socials.push({net:s[0],url:u.href});}});
      const tel=[...new Set(links.filter(l=>/^tel:/i.test(l.href)).map(l=>l.href.slice(4)))];
      const whatsapp=links.some(l=>/wa\.me|whatsapp/i.test(l.href));
      const booking=[...new Set(links.filter(l=>BOOKING_RX.test(l.href)).map(l=>{try{return new URL(l.href,base||undefined).hostname.replace(/^www\./,'');}catch(e){return '';}}).filter(Boolean))].slice(0,4);
      const tracking=TRACK_RX.filter(([,rx])=>rx.test(html)).map(([n])=>n);
      const gen=(doc.querySelector('meta[name="generator" i]')&&doc.querySelector('meta[name="generator" i]').getAttribute('content'))||'';
      const cms=gen||((CMS_RX.find(([,rx])=>rx.test(html))||[])[0]||'');
      const title=!!((doc.querySelector('title')&&doc.querySelector('title').textContent||'').trim());
      const metaDesc=!!((doc.querySelector('meta[name="description" i]')&&doc.querySelector('meta[name="description" i]').getAttribute('content')||'').trim());
      const viewport=!!doc.querySelector('meta[name="viewport" i]');
      const ldTypes=new Set();
      doc.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const walk=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o))return o.forEach(walk);const t=o['@type'];(Array.isArray(t)?t:[t]).filter(Boolean).forEach(x=>ldTypes.add(String(x)));if(o['@graph'])walk(o['@graph']);};walk(JSON.parse(s.textContent));}catch(e){}});
      const localSchema=hasLocalBusinessSchema([...ldTypes]);
      const text=(doc.body&&doc.body.textContent||'').replace(/\s+/g,' ');
      const words=text.split(' ').filter(w=>w.length>2).length;
      const hoursOnSite=/horaires|heures d.ouverture|ouvert du/i.test(text)||(/\b(lundi|mardi)\b/i.test(text)&&/\b\d{1,2}\s?h|\d{1,2}:\d{2}/.test(text));
      const addressOnSite=/\b\d{5}\b/.test(text)&&/rue|avenue|boulevard|place|chemin|route|impasse|quai/i.test(text);
      const years=[...text.matchAll(/(?:©|copyright|depuis)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map(m=>+m[1]).filter(y=>y>1990&&y<=new Date().getFullYear());
      const copyrightYear=years.length?Math.min(...years):null;
      return {socials,tel,whatsapp,booking,tracking,cms,title,metaDesc,viewport,ldTypes:[...ldTypes],localSchema,words,hoursOnSite,addressOnSite,copyrightYear,pageRead:true,analyzedAt:new Date().toISOString(),finalUrl:pageUrl};
    }

export const GENERIC_NAME=new Set(['boulangerie','restaurant','cafe','coiffure','garage','hotel','pizzeria','boucherie','pharmacie','centre','salon','auto','pizza','bar','maison','atelier','studio','institut','commerce','shop','store','food','snack','kebab','sushi','traiteur','fleuriste','opticien','tabac','presse']);

export function businessInUrl(url,name){
      const blob=norm(url), full=norm(name);
      if(!full||full.length<4) return false;
      if(full.length>6&&blob.includes(full)) return true;
      const tokens=full.split(' ').filter(w=>w.length>3&&!GENERIC_NAME.has(w));
      return tokens.length>0&&tokens.every(tok=>blob.includes(tok));
    }
