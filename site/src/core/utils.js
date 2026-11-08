/* AuditIA — utilitaires purs (étape 2 de la refonte).
   Code déplacé tel quel depuis site/index.html : aucune dépendance à l'interface ni à l'état global. */
export function brandColor(v){const x=String(v||'').trim().toLowerCase();return (!x||x==='#7657ed')?'#5B5FEF':v}

export function safeColor(value,fallback){ return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value||'').trim())?String(value).trim():fallback; }

export const escHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export { safePublicHttpUrl as safeHttpUrl } from './public-url.mjs';

export function keyHash(v){let h=5381;const s=String(v||'');for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36);}

export const withTimeout = (p,ms) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);

export const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function siteHost(c){ const w=String((c&&c.website)||'').trim(); if(!w) return ''; try{ return new URL(/^https?:///i.test(w)?w:'https://'+w).hostname.replace(/^www./,''); }catch(e){ return ''; } }

export function hexToRgb(h){ h=String(h||'#5B5FEF').replace('#',''); if(h.length===3)h=h.split('').map(x=>x+x).join(''); const n=parseInt(h,16); const v=isNaN(n)?0x5B5FEF:n; return [(v>>16)&255,(v>>8)&255,v&255]; }
