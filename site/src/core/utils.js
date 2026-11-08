/* AuditIA — utilitaires purs (étape 2 de la refonte).
   Code déplacé tel quel depuis site/index.html : aucune dépendance à l'interface ni à l'état global. */
export function brandColor(v){const x=String(v||'').trim().toLowerCase();return (!x||x==='#7657ed')?'#5B5FEF':v}

export function safeColor(value,fallback){ return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value||'').trim())?String(value).trim():fallback; }

export const escHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function safeHttpUrl(value){
      const raw=String(value||'').trim();
      if(!/^https?:\/\//i.test(raw)) return '';
      let u;
      try{ u=new URL(raw); }catch(e){ return ''; }
      if(u.username||u.password||(u.protocol!=='https:'&&u.protocol!=='http:')) return '';
      const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
      if(!h||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h==='0.0.0.0'||h==='::1'||h==='metadata.google.internal') return '';
      if(/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.)/.test(h)) return '';
      return u.href;
    }

export function keyHash(v){let h=5381;const s=String(v||'');for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36);}

export const withTimeout = (p,ms) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);

export const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function siteHost(c){ const w=String((c&&c.website)||'').trim(); if(!w) return ''; try{ return new URL(/^https?:\/\//i.test(w)?w:'https://'+w).hostname.replace(/^www\./,''); }catch(e){ return ''; } }

export function hexToRgb(h){ h=String(h||'#5B5FEF').replace('#',''); if(h.length===3)h=h.split('').map(x=>x+x).join(''); const n=parseInt(h,16); const v=isNaN(n)?0x5B5FEF:n; return [(v>>16)&255,(v>>8)&255,v&255]; }

/* Données Google : préserver la différence entre zéro observé et valeur indisponible. */
export function googleReviewCount(value){
  if(value==null||value===''||typeof value==='boolean') return null;
  const n=Number(value);
  return Number.isInteger(n)&&n>=0?n:null;
}
export function googleRatingValue(value){
  if(value==null||value===''||typeof value==='boolean') return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>=0&&n<=5?n:null;
}
export function formatGoogleProfileSummary(rating,reviews){
  const r=googleRatingValue(rating), n=googleReviewCount(reviews);
  if(r==null&&n==null) return '';
  const ratingText=r==null?'Note non disponible':'★ '+String(r).replace('.',',')+'/5';
  const reviewsText=n==null?'avis non disponibles':n+' avis';
  return ratingText+' · '+reviewsText;
}
export function compareGoogleReviewCounts(a,b){
  const ar=googleReviewCount(a&&a.reviews), br=googleReviewCount(b&&b.reviews);
  if(ar==null&&br!=null) return 1;
  if(ar!=null&&br==null) return -1;
  if(ar!=null&&br!=null&&ar!==br) return br-ar;
  const at=googleRatingValue(a&&a.rating), bt=googleRatingValue(b&&b.rating);
  if(at==null&&bt!=null) return 1;
  if(at!=null&&bt==null) return -1;
  if(at!=null&&bt!=null&&at!==bt) return bt-at;
  return String(a&&a.name||'').localeCompare(String(b&&b.name||''),'fr');
}
