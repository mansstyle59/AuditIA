/* AuditIA — briques du rapport PDF (jsPDF) : mise en page (pdfKit), bandeau, verdict, synthèse, qualité des preuves, pied de page.
   Fonctions qui reçoivent l'objet jsPDF en paramètre ; aucune dépendance à l'interface. Déplacées telles quelles depuis site/index.html (étape 2).
   buildPdfFull / buildPdfSimple restent dans index.html : elles lisent encore les réglages globaux (voir docs/refonte-moteur.md). */
import { brandColor, hexToRgb } from '../core/utils.js';
import { visibilityLabel, visibilityVerdict } from '../audit/scoring.js';

export function pdfScoreCol(v){ return v>=75?[31,157,87]:v>=50?[201,138,0]:[192,57,43]; }

export function pdfKit(pdf,st){
      const W=210,H=297,M=18,CW=W-2*M,PT=0.3528; let y=M;
      const pageTop=()=>{ const col=hexToRgb(brandColor(st&&st.primary_color)); pdf.setFillColor(250,249,253); pdf.rect(0,0,W,H,'F'); pdf.setFillColor(col[0],col[1],col[2]); pdf.rect(0,0,W,22,'F'); pdfAuditiaMark(pdf,M,4,14,col); pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.setTextColor(255,255,255); pdf.text(String((st&&st.app_name)||'AuditIA'),M+18,10.5); pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.text('RAPPORT DE VISIBILITÉ NUMÉRIQUE',M+18,16); pdf.setFontSize(7.5); pdf.text(String((st&&st.company_name)||'AffiAds'),W-M,10.5,{align:'right'}); pdf.setTextColor(130,125,148); pdf.text('Suite du rapport · '+new Date().toLocaleDateString('fr-FR'),W-M,16,{align:'right'}); };
      const DARK=[32,28,46], MUT=[112,108,132], LINE=[225,221,237];
      const setF=(s,sz)=>{pdf.setFont('helvetica',s||'normal');pdf.setFontSize(sz);};
      const setT=c=>pdf.setTextColor(c[0],c[1],c[2]);
      const lh=(sz,f)=>sz*PT*(f||1.35);
      const K={W,H,M,CW,DARK,MUT,LINE,setF,setT,lh,
        get y(){return y;}, set y(v){y=v;},
        ensure(h){ if(y+h>H-M){ pdf.addPage(); pageTop(); y=30; } },
        gap(h){ y+=h; },
        para(str,o){ o=o||{}; const x=o.x||M; const sz=o.size||10; const col=o.color||DARK; const maxw=(o.w||CW)-(x-M); setF(o.style||'normal',sz); setT(col); const lines=pdf.splitTextToSize(String(str==null?'':str),maxw); const step=lh(sz,o.lh); lines.forEach(ln=>{ K.ensure(step); pdf.text(ln,x,y+sz*PT*0.8); y+=step; }); },
        heading(str,col){ K.gap(4); K.ensure(26); setF('bold',12); setT(col||DARK); pdf.text(String(str),M,y+3.6); y+=6.2; pdf.setDrawColor(LINE[0],LINE[1],LINE[2]); pdf.setLineWidth(0.45); pdf.line(M,y,W-M,y); y+=4.2; },
        hr(){ K.ensure(3); pdf.setDrawColor(LINE[0],LINE[1],LINE[2]); pdf.setLineWidth(0.2); pdf.line(M,y,W-M,y); y+=3; },
        bullet(label,desc,mkCol){ const sz=9.5; setF('bold',sz); const lbl=pdf.splitTextToSize(String(label),CW-6); let dl=[]; if(desc){ setF('normal',8.5); dl=pdf.splitTextToSize(String(desc),CW-6); } K.ensure(lh(sz)*lbl.length+lh(8.5)*dl.length+1); pdf.setFillColor(mkCol[0],mkCol[1],mkCol[2]); pdf.circle(M+1.3,y+1.7,0.9,'F'); setF('bold',sz); setT(DARK); lbl.forEach(ln=>{ pdf.text(ln,M+5,y+sz*PT*0.8); y+=lh(sz); }); if(dl.length){ setF('normal',8.5); setT(MUT); dl.forEach(ln=>{ pdf.text(ln,M+5,y+8.5*PT*0.8); y+=lh(8.5); }); } y+=1.4; },
        kv(k,v){ const sz=9.5; setF('bold',sz); const vLines=pdf.splitTextToSize(String(v==null?'':v),CW-44); K.ensure(lh(sz)*vLines.length); setF('normal',sz); setT(MUT); pdf.text(String(k),M,y+sz*PT*0.8); setF('bold',sz); setT(DARK); vLines.forEach(ln=>{ pdf.text(ln,M+42,y+sz*PT*0.8); y+=lh(sz); }); },
        rowLR(left,right){ const sz=9.5; setF('bold',sz); const rw=pdf.getTextWidth(String(right)); const leftMax=CW-rw-6; setF('normal',sz); const ll=pdf.splitTextToSize(String(left),leftMax); K.ensure(lh(sz)*ll.length); setT(DARK); ll.forEach((ln,i)=>{ setF('normal',sz); setT(DARK); pdf.text(ln,M,y+sz*PT*0.8); if(i===0){ setF('bold',sz); pdf.text(String(right),W-M,y+sz*PT*0.8,{align:'right'}); } y+=lh(sz); }); }
      };
      return K;
    }

export function pdfFooter(pdf,st){ const n=pdf.internal.getNumberOfPages(); for(let i=1;i<=n;i++){ pdf.setPage(i); pdf.setDrawColor(229,225,239); pdf.setLineWidth(0.25); pdf.line(18,286,192,286); pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(130,125,148); pdf.text('Rapport généré par '+(st.app_name||'AuditIA')+' · '+(st.company_name||'AffiAds'),18,291); pdf.text('Page '+i+' / '+n,192,291,{align:'right'}); } }

export function pdfAuditiaMark(pdf,x,y,size,col){
      const c=col||[118,87,237]; pdf.setFillColor(c[0],c[1],c[2]); pdf.roundedRect(x,y,size,size,2,2,'F');
      pdf.setDrawColor(255,255,255); pdf.setLineWidth(Math.max(.45,size*.055));
      pdf.line(x+size*.22,y+size*.76,x+size*.46,y+size*.25); pdf.line(x+size*.46,y+size*.25,x+size*.72,y+size*.76);
      pdf.line(x+size*.33,y+size*.56,x+size*.61,y+size*.56);
      pdf.setDrawColor(255,173,114); pdf.setLineWidth(Math.max(.55,size*.065)); pdf.line(x+size*.58,y+size*.78,x+size*.69,y+size*.88); pdf.line(x+size*.69,y+size*.88,x+size*.88,y+size*.65);
    }

export function pdfHeadBand(pdf,K,st,a,title){ const col=hexToRgb(brandColor(st.primary_color)); pdf.setFillColor(250,249,253); pdf.rect(0,0,K.W,K.H,'F'); pdf.setFillColor(col[0],col[1],col[2]); pdf.rect(0,0,K.W,28,'F'); pdfAuditiaMark(pdf,K.M,5.5,17,col); K.setF('bold',15); pdf.setTextColor(255,255,255); pdf.text(String(st.app_name||'AuditIA'),K.M+22,13); K.setF('normal',8.5); pdf.text(title,K.M+22,20); K.setF('normal',8); pdf.text(new Date(a.updated_at||Date.now()).toLocaleDateString('fr-FR'),K.W-K.M,12,{align:'right'}); pdf.text(String(st.company_name||'AffiAds'),K.W-K.M,20,{align:'right'}); K.y=36; }

export function pdfClientVerdict(pdf,K,a,c,d,diag){
      const idx=diag.index, lab=idx==null?{t:'Données insuffisantes'}:visibilityLabel(idx), ic=idx==null?K.MUT:pdfScoreCol(idx);
      K.para((c&&c.name)||'Commerce',{style:'bold',size:21});
      K.para([c&&c.city,c&&(c.category||d.category)].filter(Boolean).join('   ·   '),{color:K.MUT,size:9.5});
      K.para('BILAN DE VISIBILITÉ NUMÉRIQUE · '+new Date(a.updated_at||Date.now()).toLocaleDateString('fr-FR'),{color:K.MUT,size:7.5}); K.gap(2);
      K.ensure(27); pdf.setFillColor(244,241,252); pdf.roundedRect(K.M,K.y,K.CW,23,3,3,'F'); pdf.setFillColor(ic[0],ic[1],ic[2]); pdf.rect(K.M,K.y,2,23,'F');
      K.setF('bold',idx==null?18:34); K.setT(ic); pdf.text(idx==null?'—':String(idx),K.M+5,K.y+13);
      if(idx!=null){K.setF('normal',10);K.setT(K.MUT);pdf.text('/100',K.M+5+String(idx).length*8.5,K.y+13);}
      K.setF('bold',11);K.setT(ic);pdf.text(lab.t,K.M+43,K.y+13);K.y+=27;
      K.para(visibilityVerdict(idx,diag),{size:9.5});
      K.para('SEO = visibilité dans les moteurs de recherche ; GEO = signaux de lisibilité et de présence susceptibles d’aider les assistants IA à comprendre l’entreprise. Une citation IA n’est jamais garantie.',{size:8,color:K.MUT}); K.gap(1);
      const bar=(label,score,x,w)=>{
        K.setF('bold',9);K.setT(K.DARK);pdf.text(label,x,K.y+3.2);
        K.setT(score==null?K.MUT:pdfScoreCol(score));pdf.text((score==null?'—':score+'/100'),x+w,K.y+3.2,{align:'right'});
        pdf.setFillColor(230,226,240);pdf.roundedRect(x,K.y+4.6,w,2.1,1,1,'F');
        if(score!=null){const col=pdfScoreCol(score);pdf.setFillColor(col[0],col[1],col[2]);pdf.roundedRect(x,K.y+4.6,Math.max(1.4,w*Math.max(0,Math.min(100,Number(score)||0))/100),2.1,1,1,'F');}
      };
      K.ensure(12);const gap=6,bw=(K.CW-gap)/2;bar('SEO — Google',diag.seo.score,K.M,bw);bar('GEO — IA',diag.geo.score,K.M+bw+gap,bw);K.y+=12;
    }

export function pdfExecutiveSummary(pdf,K,a,c,diag,col){
      const d=(c&&c.details)||{}, site=a&&a.site, scan=a&&a.scan;
      K.heading('Synthèse exécutive',col);
      K.para('Cette synthèse présente les principaux signaux relevés dans le dossier et les décisions à privilégier. Elle ne remplace pas la lecture des constats détaillés ci-après.',{size:8.5,color:K.MUT});
      const stats=[
        ['Score de visibilité',String(diag.index)+'/100'],
        ['SEO — Google',String(diag.seo.score)+'/100'],
        ['GEO — assistants IA',String(diag.geo.score)+'/100']
      ];
      const gap=3, cw=(K.CW-gap*2)/3, y=K.y;
      K.ensure(24);
      stats.forEach((it,i)=>{const x=K.M+i*(cw+gap);pdf.setFillColor(244,241,252);pdf.roundedRect(x,K.y,cw,17,2,2,'F');K.setF('normal',7.2);K.setT(K.MUT);pdf.text(it[0],x+3,K.y+5);K.setF('bold',15);K.setT(col);pdf.text(it[1],x+3,K.y+12.5);});
      K.y+=21;
      const evidence=[
        ['Profil local',!!(d.place_id||d.address||d.rating!=null||d.reviews!=null)],
        ['Analyse du site',!!(site&&site.pageRead)],
        ['Mesure technique',!!(scan&&scan.scores)],
        ['Comparaison locale',!!(site&&site.competitors&&site.competitors.list&&site.competitors.list.length)],
        ['Recherches de mots-clés',!!(site&&site.rankings&&site.rankings.length)]
      ];
      const n=evidence.filter(x=>x[1]).length;
      K.para('Couverture des vérifications : '+n+' / '+evidence.length+' familles de signaux disponibles dans ce dossier.',{size:9,style:'bold'});
      K.para('Lecture du résultat : '+visibilityVerdict(diag.index),{size:9});
      const top=(diag.weaknesses||[]).slice(0,3);
      if(top.length){K.gap(1);K.setF('bold',9.5);K.setT(K.DARK);pdf.text('Décisions à prioriser',K.M,K.y+3.2);K.y+=5.5;top.forEach((x,i)=>K.bullet((i+1)+'. '+x.label,'À traiter puis à contrôler lors du prochain audit.',col));}
      K.para('Important : un score est un indicateur synthétique des signaux disponibles, pas une mesure officielle de Google ni une promesse de visibilité, de contacts ou de chiffre d’affaires.',{size:7.8,color:K.MUT});
    }

export function pdfEvidenceQuality(pdf,K,a,c,col){
      const d=(c&&c.details)||{}, scan=a&&a.scan, site=a&&a.site;
      const signals=[
        ['Fiche commerce',!!(d.place_id||d.address||d.rating!=null||d.reviews!=null)],
        ['Site web',!!(site&&site.pageRead)],
        ['Performance Lighthouse',!!(scan&&scan.scores)],
        ['Concurrents locaux',!!(site&&site.competitors&&site.competitors.list&&site.competitors.list.length)],
        ['Recherches de présence web',!!(site&&site.rankings&&site.rankings.length)]
      ];
      const available=signals.filter(x=>x[1]).map(x=>x[0]);
      const missing=signals.filter(x=>!x[1]).map(x=>x[0]);
      K.heading('Méthode, périmètre et fiabilité',col);
      K.para('Rapport généré le '+new Date().toLocaleString('fr-FR')+'. État du dossier : '+String((a&&a.status)||'non précisé')+'. Les constats ci-dessous dépendent des données présentes dans ce dossier à la date de génération.',{size:8.5});
      K.para('Contrôle des sources : '+signals.map(x=>x[0]+(x[1]?' — disponible':' — non confirmé')).join(' · ')+'.',{size:8,color:K.MUT});
      K.para('Éléments présents : '+(available.length?available.join(' · '):'aucune source détaillée reconnue dans ce dossier')+'.',{size:8,color:K.MUT});
      if(missing.length) K.para('Éléments non disponibles ou non confirmés : '+missing.join(' · ')+'. Leur absence ne prouve pas un défaut du commerce.',{size:8,color:K.MUT});
      K.para('Les constats reflètent les données accessibles au moment de l’audit. Un classement de popularité ou une recherche indicative ne constitue pas le classement exact de Google. Les scores ne garantissent ni position, ni appels, ni ventes.',{size:8,color:K.MUT});
    }
