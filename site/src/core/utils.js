/* AuditIA — utilitaires purs (étape 2 de la refonte).
   Code déplacé tel quel depuis site/index.html : aucune dépendance à l'interface ni à l'état global. */
export function brandColor(v){const x=String(v||'').trim().toLowerCase();return (!x||x==='#7657ed')?'#5B5FEF':v}

export function safeColor(value,fallback){ return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value||'').trim())?String(value).trim():fallback; }

export const escHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function isBlockedPublicHost(host) {
  const name = String(host || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!name) return true;

  // Les hôtes locaux/cloud privés et les services de résolution d'IP en wildcard ne sont pas des cibles d'audit.
  const blockedSuffixes = [
    '.localhost', '.local', '.localdomain', '.internal', '.lan', '.home', '.corp',
    '.test', '.invalid', '.example', '.onion', '.nip.io', '.sslip.io', '.xip.io',
    '.localtest.me', '.vcap.me'
  ];
  if (name === 'localhost' || name === 'metadata' || name === 'instance-data' ||
      name === 'metadata.google.internal' || name === 'instance-data.ec2.internal' ||
      blockedSuffixes.some(suffix => name.endsWith(suffix))) return true;

  // Les URL IPv6 littérales sont refusées : cela évite les formes loopback, link-local,
  // ULA, IPv4-mappées et les adresses de transition difficiles à classifier sans resolver.
  if (name.includes(':')) return true;

  // URL normalise les formes IPv4 décimales, hexadécimales et abrégées avant cette vérification.
  const match = name.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b, c, d] = match.slice(1).map(Number);
  if ([a, b, c, d].some(n => n > 255)) return true;

  // Plages non publiques, spéciales, de documentation, de benchmark ou multicast.
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||                 // CGNAT
    (a === 169 && b === 254) ||                            // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 2 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 255 && b === 255 && c === 255 && d === 255);
}

export function safeHttpUrl(value){
  const raw=String(value||'').trim();
  if(!/^https?:\/\//i.test(raw)) return '';
  let u;
  try{ u=new URL(raw); }catch(e){ return ''; }
  if(u.username||u.password||(u.protocol!=='https:'&&u.protocol!=='http:')) return '';
  const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
  if(isBlockedPublicHost(h)) return '';
  return u.href;
}

export function keyHash(v){let h=5381;const s=String(v||'');for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36);}

export const withTimeout = (p,ms) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);

export const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function siteHost(c){ const w=String((c&&c.website)||'').trim(); if(!w) return ''; try{ return new URL(/^https?:\/\//i.test(w)?w:'https://'+w).hostname.replace(/^www\./,''); }catch(e){ return ''; } }

export function hexToRgb(h){ h=String(h||'#5B5FEF').replace('#',''); if(h.length===3)h=h.split('').map(x=>x+x).join(''); const n=parseInt(h,16); const v=isNaN(n)?0x5B5FEF:n; return [(v>>16)&255,(v>>8)&255,v&255]; }
