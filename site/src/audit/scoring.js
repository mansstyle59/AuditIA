/* AuditIA — calcul du score de visibilité, verdicts et plans d'action.
   Fonctions pures (audit + client en entrée → données en sortie), déplacées telles quelles depuis site/index.html (étape 2).
   Aucune dépendance à l'interface : le score ne dépend que des données mesurées. */
export function targetKeywords(c){
      const city=String((c&&c.city)||'').trim();
      const d=(c&&c.details)||{};
      const t=((c&&c.name)||'')+' '+((c&&c.category)||d.category||'')+' '+(d.primaryType||'');
      const s=t.toLowerCase();
      const map=[
        [/camping|campground|rv[_ ]?park|holiday[_ ]?park|mobil.?home|mobilhome|caravan|bungalow|village.?vacances/,['camping','location mobil-home','où dormir en camping']],
        [/resort/,['hébergement','village vacances','où dormir']],
        [/hotel|h[ôo]tel|motel|hostel|auberge|bed_and_breakfast|b&b/,['hôtel','où dormir']],
        [/lodging|h[ée]berg|g[îi]te|chambre.?d|logement|guest/,['hébergement','où dormir']],
        [/boulanger|bakery|p[âa]tiss/,['boulangerie','pâtisserie','pain artisanal']],
        [/restaurant|meal_|food|brasserie|pizz|diner|traiteur/,['restaurant','où manger','meilleur restaurant']],
        [/cafe|coffee|\bbar\b|pub/,['café','bar','terrasse']],
        [/hair|salon|coiff|barber/,['coiffeur','salon de coiffure','barbier']],
        [/nail|ongle/,['onglerie','manucure']],
        [/spa|wellness|massage|beaut/,['institut de beauté','spa','soin du visage']],
        [/plumb|plomb/,['plombier','dépannage plomberie']],
        [/electric|électric/,['électricien','dépannage électrique']],
        [/paint|peint|fa[çc]ad/,['peintre','façadier','ravalement de façade']],
        [/garage|car_repair|auto|m[ée]can/,['garage auto','réparation voiture','garagiste']],
        [/pharmac/,['pharmacie']],
        [/fleuri|florist/,['fleuriste','livraison de fleurs']],
        [/store|shop|market|boutique|commerce/,['boutique','magasin']]
      ];
      let base=[]; for(const [rx,ks] of map){ if(rx.test(s)){ base=ks; break; } }
      if(!base.length){ const cat=String((c&&c.category)||d.category||'').trim(); base=[cat&&cat.toLowerCase()!=='autre'?cat.toLowerCase():'commerce']; }
      const b0=base[0];
      const seo=new Set(); base.forEach(b=>seo.add(city?b+' '+city:b));
      if(city){ ['meilleur '+b0+' '+city,b0+' près de '+city,'avis '+b0+' '+city,b0+' '+city+' horaires'].forEach(k=>seo.add(k)); }
      const geo=[]; if(city){ geo.push('Quel est le meilleur '+b0+' à '+city+' ?'); geo.push('Où trouver un bon '+b0+' à '+city+' ?'); geo.push('Recommande-moi un '+b0+' à '+city); }
      return { seo:[...seo].slice(0,8), geo:geo.slice(0,3), base:b0, city };
    }

export function socialVisibility(a){
      const soc=(a&&a.site&&a.site.socials)||[]; const n=soc.length;
      const major=['Instagram','Facebook','TikTok','YouTube'].filter(k=>soc.some(s=>s.net===k)).length;
      let label,tone;
      if(!(a&&a.site)){ return {analyzed:false,n:0,major:0,label:'Non analysé',tone:'no'}; }
      if(n===0){ label='Aucune présence sociale détectée sur le site'; tone='bad'; }
      else if(n<=1){ label='Visibilité sociale faible — 1 réseau seulement'; tone='bad'; }
      else if(n<=3){ label='Visibilité sociale correcte — '+n+' réseaux'; tone='mid'; }
      else { label='Bonne visibilité sociale — '+n+' réseaux'; tone='ok'; }
      return {analyzed:true,n,major,label,tone};
    }

export function businessAge(a,c){
      const d=(c&&c.details)||{}; const sir=d.sirene;
      if(sir&&sir.matched&&sir.dateCreation){ const dt=new Date(sir.dateCreation); if(!isNaN(dt.getTime())) return { since:dt.getFullYear(), detail:'immatriculé le '+dt.toLocaleDateString('fr-FR')+' (source officielle SIRENE)', hasData:true, official:true }; }
      const dom=d.domainCreated?new Date(d.domainCreated):null;
      const cy=(a&&a.site&&a.site.copyrightYear)||null;
      const years=[]; if(dom&&!isNaN(dom.getTime())) years.push(dom.getFullYear()); if(cy) years.push(cy);
      const since=years.length?Math.min(...years):null;
      const parts=[]; if(dom&&!isNaN(dom.getTime())) parts.push('domaine enregistré le '+dom.toLocaleDateString('fr-FR')); if(cy) parts.push('mention « '+cy+' » sur le site');
      return { since, detail:parts.join(' · '), hasData:!!since, official:false };
    }

export function rankBadge(r){ if(r.error) return {t:'indisponible',c:'no'}; if(r.pos==null) return {t:'non trouvé',c:'bad'}; if(r.pos<=3) return {t:'n°'+r.pos+' · très bien placé',c:'ok'}; if(r.pos<=10) return {t:'n°'+r.pos+' · page 1',c:'mid'}; return {t:'page 2 (n°'+r.pos+')',c:'bad'}; }

export function improvementPlan(a,c){
      const d=(c&&c.details)||{}; const si=(a&&a.site)||{}; const s=a&&a.scan;
      const kw=targetKeywords(c); const city=String((c&&c.city)||'').trim(); const base=kw.base||'votre activité';
      const hasGoogle=!!String(d.place_id||'').trim();
      const rating=(hasGoogle&&d.rating!=null&&Number.isFinite(Number(d.rating)))?Number(d.rating):null;
      const reviews=(hasGoogle&&d.reviews!=null&&Number.isFinite(Number(d.reviews)))?Number(d.reviews):null;
      const photos=(hasGoogle&&d.photoCount!=null&&Number.isFinite(Number(d.photoCount)))?Number(d.photoCount):null;
      const hours=hasGoogle&&Array.isArray(d.hours)&&d.hours.length>0;
      const hasGoogle=!!(d.place_id||d.address||d.rating!=null);
      const rating=(d.rating!=null)?Number(d.rating):null; const reviews=Number(d.reviews||0);
      const photos=(d.photoCount!=null)?Number(d.photoCount):null;
      const hours=!!(Array.isArray(d.hours)&&d.hours.length);
      const hasWeb=!!String((c&&c.website)||'').trim();
      const perf=(s&&s.scores)?s.scores.performance:null;
      const socials=(si.socials)||[]; const haveNet=new Set(socials.map(x=>x.net));
      const missingNet=['Instagram','Facebook','TikTok'].filter(m=>!haveNet.has(m));
      const dirs=(si.directories)||[]; const comp=si.competitors; const topComp=comp&&comp.list&&comp.list.find(x=>!x.isSelf);
      const items=[]; const push=(axis,title,why,how,priority,impact)=>items.push({axis,title,why,how,priority,impact});
      if(!hasGoogle) push('Fiche Google','Vérifier et associer la fiche Google Business Profile','Aucun identifiant Google Places n’est associé à ce dossier. Cela ne prouve pas que la fiche n’existe pas : vérifiez le commerce dans Google Maps/Places avant de conclure.',['Rechercher le nom exact et la ville dans Google Maps ou Places','Comparer l’adresse et le téléphone avec les informations du commerçant','Associer la fiche confirmée au dossier AuditIA via Google Places'],'Haute','Fort');
      else push('Fiche Google','Compléter la fiche Google à 100 %','Une fiche complète aide les clients à vérifier rapidement les informations essentielles. Son effet sur la position dépend aussi de la pertinence, de la distance et de la notoriété.',['Rédiger une description avec vos services + la ville','Ajouter catégories secondaires, zone desservie et attributs (accès, paiements, Wi-Fi, terrasse…)','Renseigner les produits/services avec photos et prix','Ajouter un lien d’action (réserver / commander / prendre RDV)'],'Haute','Fort');
      if(hasGoogle&&reviews!=null&&reviews<10) push('Avis & réputation','Lancer une collecte d’avis Google','Les avis contribuent à la confiance des clients et constituent un signal parmi d’autres pour la visibilité locale. Volume observé : '+reviews+' avis'+(rating!=null?' ('+rating+'/5)':'')+'.'+(topComp?' Votre concurrent '+topComp.name+' en a déjà '+topComp.reviews+' — l’écart se rattrape avec une collecte régulière.',['QR code vers l’avis Google en caisse / à l’accueil','SMS ou e-mail après l’achat avec le lien court d’avis','Former l’équipe à demander un avis à l’oral aux clients contents','Objectif : 5 à 10 nouveaux avis par mois','Répondre à 100 % des avis (merci + réponse pro aux négatifs)'],'Haute','Fort');
       else if(hasGoogle&&rating!=null&&rating<4.3) push('Avis & réputation','Faire remonter la note Google','Note actuelle '+rating+'/5 : une note plus basse peut réduire la confiance des clients et rendre la comparaison moins favorable'+(topComp&&topComp.rating?' (ex. '+topComp.name+' : ★ '+topComp.rating+')':'')+'.',['Répondre posément à chaque avis négatif et corriger les points récurrents','Solliciter activement les clients satisfaits (ils notent rarement d’eux-mêmes)','Viser une majorité d’avis récents (Google valorise la fraîcheur)'],'Haute','Fort');
       if(hasGoogle&&photos!=null&&photos<10) push('Fiche Google','Ajouter des photos récentes (et régulièrement)','Le nombre de photos récupéré est de '+photos+'. Vérifier la qualité et la récence, pas seulement le volume.',['Devanture, intérieur, produits phares, équipe','Photo de couverture et logo soignés','Ajouter 2 à 3 nouvelles photos par mois pour montrer l’activité'],'Moyenne','Moyen');
      if(hasGoogle&&!hours) push('Fiche Google','Vérifier les horaires sur la fiche Google','Les horaires n’ont pas été récupérés dans les données disponibles. Vérifiez la fiche publique avant de conclure qu’ils sont absents.',['Confirmer les horaires habituels avec le commerçant','Mettre à jour les horaires et les exceptions sur la fiche Google'],'Moyenne','Moyen');
      push('Fiche Google','Publier des “posts” Google régulièrement','Les posts permettent de présenter les offres, nouveautés et événements aux personnes qui consultent la fiche ; leur effet sur le classement n’est pas garanti.',['Publier 1 à 2 posts par mois (promo, nouveauté, événement)','Ajouter une photo + un bouton d’action à chaque post'],'À planifier','Moyen');
       if(!hasWeb) push('Site web','Vérifier si le commerce dispose d’un site web','Aucune URL n’est renseignée dans AuditIA. Cela ne prouve pas que le commerce n’a pas de site : confirmer auprès du commerçant avant de recommander une création.',['Demander l’adresse officielle au commerçant','Vérifier que le site correspond bien à l’établissement','Ajouter l’URL validée au dossier AuditIA'],'Haute','Fort');
      else { if(perf!=null&&perf<50) push('Site web','Accélérer le site sur mobile','Performance mobile '+perf+'/100. Plus d’un visiteur sur deux quitte un site qui met plus de 3 s à charger, et Google pénalise les sites lents.',['Compresser et servir les images en WebP','Limiter les scripts et plugins tiers','Activer le cache + bon hébergement','Charger les images en différé (lazy-load)'],'Haute','Fort');
        if(si.pageRead&&!(si.title&&si.metaDesc)) push('Site web','Optimiser les balises SEO','Sans titre ni description clairs, Google n’a pas de résumé à afficher et vous perdez des clics dans les résultats.',['Titre < 60 caractères avec activité + ville','Meta-description accrocheuse (140-160 car.) avec appel à l’action','Un seul H1 par page, structuré avec des sous-titres'],'Moyenne','Moyen'); }
      if(hasWeb&&si.pageRead&&!si.localSchema) push('Visibilité IA (GEO)','Ajouter les données structurées (schema.org LocalBusiness)','LE levier pour être compris par Google ET par les IA. Les données structurées disent « qui, quoi, où, quand » ; sans elles, ChatGPT ou Gemini ont du mal à vous citer quand un client demande « meilleur '+base+(city?' à '+city:'')+' ».',['Ajouter un bloc JSON-LD « LocalBusiness » (nom, adresse, téléphone, horaires, position)','Reprendre exactement les coordonnées de Google (cohérence NAP)','Ajouter FAQ et avis structurés si possible'],'Haute','Fort');
      if(socials.length===0) push('Réseaux sociaux','Créer Instagram et Facebook','Les clients locaux vérifient les réseaux pour voir si le commerce est actif. Une absence donne une impression d’abandon.',['Créer Instagram + Facebook avec bio complète (adresse, horaires, lien)','Publier les premières photos et une présentation','Relier ces profils au site et à la fiche Google'],'Moyenne','Moyen');
      else if(missingNet.length) push('Réseaux sociaux','Compléter les réseaux manquants : '+missingNet.join(', '),'Être présent là où sont vos clients multiplie les points de contact et rassure avant la visite.',['Créer les profils manquants avec coordonnées et lien','Garder une identité visuelle cohérente (logo, couleurs)'],'À planifier','Moyen');
      push('Réseaux sociaux','Publier régulièrement et donner envie de venir','La régularité transforme une page en vitrine vivante : coulisses, nouveautés, avis clients, offres.',['Publier 2 à 3 fois par semaine','Varier : produit, coulisses, témoignage client, offre','Coordonnées + bouton d’action (appeler / itinéraire / réserver) sur chaque profil',(hasWeb?'Afficher les réseaux sur le site et le site dans la bio':'Soigner la bio : adresse, horaires, lien de contact')],'À planifier','Moyen');
      const mainKw=(kw.seo&&kw.seo[0])||(base+(city?' '+city:''));
      const usableRk=(si.rankings||[]).filter(r=>!r.error);
      const notRanked=usableRk.length>0&&!usableRk.some(r=>r.pos!=null&&r.pos<=10);
      const behind=comp&&comp.selfRank&&comp.selfRank>3;
       if(notRanked||behind){ const arg=(comp&&comp.selfRank)?('Par nombre d’avis, ce commerce est n°'+comp.selfRank+' sur '+comp.total+' commerces comparés'+(topComp?', derrière '+topComp.name+' ('+topComp.reviews+' avis)':'')+'. Ce n’est pas le rang Google Maps.'):(notRanked?'Le nom ou le site n’apparaît pas dans les adresses des 10 premiers résultats web.':'La comparaison de concurrents doit être vérifiée à partir des données disponibles.');
        push('SEO local','Remonter sur « '+mainKw+' » (référencement local)',arg,['Optimiser la fiche Google (catégories, description, photos, posts) — 1er levier local','Accélérer la collecte d’avis récents','Mêmes nom / adresse / téléphone partout (site, annuaires, Google)','Publier du contenu local sur le site (ville, quartiers, services)','Obtenir quelques liens locaux (presse, partenaires, associations)'],'Haute','Fort'); }
      if(dirs.length<2) push('Annuaires & citations','S’inscrire sur les annuaires clés','Être référencé sur les grands annuaires renforce la cohérence des informations et la confiance (pour Google comme pour les IA).',['Pages Jaunes, Google Maps et annuaires de la ville','TripAdvisor / TheFork (resto), Planity (beauté), Doctolib (santé)…','Mettre partout EXACTEMENT les mêmes coordonnées (cohérence NAP)'],'Moyenne','Moyen');
      const rank={'Haute':0,'Moyenne':1,'À planifier':2};
      return items.sort((x,y)=>rank[x.priority]-rank[y.priority]);
    }

export const AUDIT_CATEGORY_META = [
  { id: 'google', label: 'Fiche Google & informations pratiques', description: 'Identification de l’établissement, coordonnées, horaires et photos.', scored: true },
  { id: 'reputation', label: 'Avis & e-réputation', description: 'Note publique et volume d’avis observés.', scored: true },
  { id: 'website', label: 'Site web & expérience mobile', description: 'Sécurité, lisibilité mobile, contact et qualité technique.', scored: true },
  { id: 'local_seo', label: 'SEO local & mots-clés', description: 'Référencement technique et présence dans les recherches explorées.', scored: true },
  { id: 'social', label: 'Réseaux sociaux & annuaires', description: 'Profils sociaux et présence dans les annuaires détectés.', scored: true },
  { id: 'geo', label: 'Visibilité IA & GEO', description: 'Données structurées, lisibilité et accès des assistants IA.', scored: true },
  { id: 'context', label: 'Domaine & concurrence locale', description: 'Repères complémentaires présentés comme contexte, sans note artificielle.', scored: false },
];

const CATEGORY_BY_CRITERION = {
  'Fiche Google/Maps associée': 'google',
  'Établissement identifié dans Google Places': 'google',
  'Horaires renseignés': 'google',
  'Téléphone visible': 'google',
  'Photos sur la fiche Google': 'google',
  'Note Google': 'reputation',
  'Volume d’avis': 'reputation',
  'Avis publics': 'reputation',
  'Site web': 'website',
  'Adresse du site en HTTPS': 'website',
  'Performance mobile': 'website',
  'Balises SEO (titre + description)': 'website',
  'Compatible mobile': 'website',
  'Prise de contact en ligne': 'website',
  'Référencement technique (Lighthouse)': 'local_seo',
  'Présence sur les mots-clés explorés': 'local_seo',
  'Ville dans le titre': 'local_seo',
  'Réseaux sociaux reliés': 'social',
  'Présence dans les annuaires détectés': 'social',
  'Présence sur plusieurs réseaux': 'social',
  'Entreprise présente dans SIRENE': 'geo',
  'Données structurées LocalBusiness': 'geo',
  'Contenu lisible sur la page': 'geo',
  'Adresse et horaires en clair': 'geo',
  'Cohérence du téléphone': 'geo',
  'Description claire': 'geo',
  'Robots IA et robots.txt': 'geo',
  'Fichier llms.txt': 'geo',
  'FAQ détectée': 'geo',
  'Contenu structuré': 'geo',
  'Informations concrètes': 'geo',
  'Date de mise à jour lisible': 'geo',
};

function categorySummary(meta, items) {
  const measured = items.filter(x => x.measured);
  const weight = measured.reduce((n, x) => n + (Number(x.weight) || 0), 0);
  const earned = measured.reduce((n, x) => n + (Number(x.weight) || 0) * (x.val == null ? (x.ok ? 1 : 0) : x.val), 0);
  const totalWeight = items.reduce((n, x) => n + (Number(x.weight) || 0), 0);
  return {
    ...meta,
    items,
    score: meta.scored && weight > 0 ? Math.round(earned / weight * 100) : null,
    measuredCount: measured.length,
    totalCount: items.length,
    coverage: items.length ? Math.round(measured.length / items.length * 100) : 0,
    fixCount: measured.filter(x => x.ok === false).length,
    unmeasuredCount: items.length - measured.length,
    measuredWeight: weight,
    possibleWeight: totalWeight,
  };
}

function contextEvidence(a, c) {
  const d = (c && c.details) || {};
  const si = a && a.site;
  const out = [];
  if (!(c && c.website)) {
    out.push({ label: 'Ancienneté du domaine', status: 'na', source: 'WHOIS / RDAP', detail: 'Sans objet : aucun site web n’est renseigné.' });
  } else if (d.domainCreated) {
    const date = new Date(d.domainCreated);
    out.push({ label: 'Ancienneté du domaine', status: 'measured', source: 'WHOIS / RDAP', detail: Number.isNaN(date.getTime()) ? 'Date de création : ' + String(d.domainCreated) : 'Domaine créé le ' + date.toLocaleDateString('fr-FR') + '.' });
  } else {
    out.push({ label: 'Ancienneté du domaine', status: 'unmeasured', source: 'WHOIS / RDAP', detail: 'Date de création non disponible.' });
  }
  const competitors = si && si.competitors;
  if (competitors && Array.isArray(competitors.list) && competitors.list.length) {
    const rank = competitors.selfRank ? 'Position n°' + competitors.selfRank + ' sur ' + (competitors.total || competitors.list.length) + ' selon le volume d’avis. ' : '';
    out.push({ label: 'Concurrence locale', status: 'measured', source: 'Google Places', detail: rank + competitors.list.length + ' commerces comparés. Ce repère ne représente pas le classement Google Maps.' });
  } else {
    out.push({ label: 'Concurrence locale', status: 'unmeasured', source: 'Google Places', detail: 'Aucune comparaison exploitable n’a été retournée.' });
  }
  return out;
}

export function visibilityAudit(a,c){
      const d=(c&&c.details)||{}, scan=a&&a.scan, si=a&&a.site;
      const site=String((c&&c.website)||d.website||'').trim();
      const secure=/^https:\/\//i.test(site);
      const googlePlaceId=String(d.place_id||'').trim();
      const hasGoogle=googlePlaceId?true:null;
      const rating=(googlePlaceId&&d.rating!=null&&Number.isFinite(Number(d.rating)))?Number(d.rating):null;
      const reviews=(googlePlaceId&&d.reviews!=null&&Number.isFinite(Number(d.reviews)))?Number(d.reviews):null;
      const phone=String((c&&c.phone)||d.phone||'').trim();
      const hours=googlePlaceId&&Array.isArray(d.hours)&&d.hours.length>0;
      const perf=scan&&scan.scores&&Number.isFinite(Number(scan.scores.performance))?Number(scan.scores.performance):null;
      const seoLh=scan&&scan.scores&&Number.isFinite(Number(scan.scores.seo))?Number(scan.scores.seo):null;
      const page=!!(si&&si.pageRead);
      const majorNets=['Instagram','Facebook','TikTok','YouTube'];
      const major=si?(si.socials||[]).filter(x=>majorNets.includes(x.net)).length:0;
      const tier=(v,stops)=>{for(const st of stops){if(v>=st[0])return st[1];}return 0;};
      const items=[];
      // Un critère n'entre dans le calcul que si une source a fourni assez de données pour le mesurer.
      const add=(pillar,label,observed,weight,bad,good,val,source)=>{
        const measured=observed!==null&&observed!==undefined;
        const ok=measured?!!observed:null;
        const v=measured?(val==null?(ok?1:0):Math.max(0,Math.min(1,Number(val)))):null;
        items.push({pillar,label,category:CATEGORY_BY_CRITERION[label] || (pillar === 'geo' ? 'geo' : 'local_seo'),ok,measured,weight,source:source||'Données du dossier',advice:!measured?'À vérifier : donnée non disponible.':ok?good:bad,gap:measured&&!ok?bad:'',val:v});
      };
      // SEO : présence locale, réputation, site et mesures techniques réellement disponibles.
      add('seo','Fiche Google/Maps associée',hasGoogle,18,'Aucun identifiant Google Places n’est associé à ce dossier. Cela ne prouve pas que la fiche est absente : vérifiez-la avant de conclure.','Identifiant Google Places associé au dossier.',null,'Google Places');
       add('seo','Site web',site?true:null,16,'Aucune URL de site web n’est renseignée dans ce dossier. Cela ne prouve pas que le commerce n’a pas de site : confirmer auprès du commerçant.','Adresse de site web renseignée.',null,'Fiche client');
      if(site) add('seo','Adresse du site en HTTPS',secure,4,'L’adresse enregistrée utilise HTTP. Vérifier la redirection HTTPS et le certificat TLS séparément.','Adresse enregistrée en HTTPS. Le certificat TLS n’a pas été vérifié par ce contrôle.',null,'Adresse enregistrée');
      if(rating!=null){const rv=tier(rating,[[4.6,1],[4.2,0.9],[4.0,0.8],[3.5,0.55],[3.0,0.3],[0,0.15]]);add('seo','Note Google',rating>=4,10,'La note publique est inférieure à 4/5. Examiner les avis et les motifs avant de définir une réponse.','Note publique : '+rating+'/5.',rv,'Google Places');}
      else add('seo','Note Google',null,10,'La note Google n’est pas disponible. Ne pas conclure que le commerce n’a pas d’avis.','Note Google disponible.',null,'Google Places');
      if(reviews!=null){const rv=tier(reviews,[[50,1],[20,0.85],[10,0.6],[3,0.35],[1,0.15],[0,0]]);add('seo','Volume d’avis',reviews>=20,10,'Le volume observé est de '+reviews+' avis. Comparer aux commerces similaires avant de fixer un objectif.','Volume observé : '+reviews+' avis.',rv,'Google Places');}
      else add('seo','Volume d’avis',null,10,'Le nombre d’avis n’est pas disponible.','Nombre d’avis disponible.',null,'Google Places');
       if(googlePlaceId&&d.hours!=null) add('seo','Horaires renseignés',hours,5,'Aucun horaire n’est présent dans les données récupérées. Vérifier la fiche publique avant de conclure.','Horaires présents dans les données récupérées.',null,'Google Places');
      else add('seo','Horaires renseignés',null,5,'Les horaires n’ont pas été récupérés.','Horaires disponibles.',null,'Fiche commerce');
      add('seo','Téléphone visible',phone?true:(d.phone===null||d.phone===undefined?null:false),5,'Aucun numéro n’est renseigné sur la fiche client. Vérifier la fiche publique.','Numéro renseigné.',null,'Fiche client');
      if(perf!=null){const pv=tier(perf,[[90,1],[70,0.8],[50,0.6],[30,0.35],[0,0.15]]);add('seo','Performance mobile',perf>=50,8,'Performance mobile mesurée à '+perf+'/100. Examiner les opportunités Lighthouse avant de choisir les optimisations.','Performance mobile mesurée à '+perf+'/100.',pv,'Google Lighthouse');}
      else add('seo','Performance mobile',null,8,'La performance mobile n’a pas été mesurée.','Performance mobile mesurée.',null,'Google Lighthouse');
      if(seoLh!=null){const lv=tier(seoLh,[[90,1],[70,0.75],[50,0.5],[0,0.25]]);add('seo','Référencement technique (Lighthouse)',seoLh>=80,6,'Score SEO technique Lighthouse : '+seoLh+'/100. Consulter les audits détaillés pour identifier les corrections pertinentes.','Score SEO technique : '+seoLh+'/100.',lv,'Google Lighthouse');}
      else add('seo','Référencement technique (Lighthouse)',null,6,'Le score SEO technique n’a pas été mesuré.','Score SEO technique mesuré.',null,'Google Lighthouse');
      if(page){
        const hasTitle=!!si.title,hasMeta=!!si.metaDesc;const tv=hasTitle&&hasMeta?1:(hasTitle||hasMeta)?0.5:0;
        add('seo','Balises SEO (titre + description)',hasTitle&&hasMeta,8,'Le titre ou la meta-description n’a pas été détecté sur la page lue.','Titre et meta-description détectés.',tv,'Lecture du site');
        add('seo','Compatible mobile',!!si.viewport,6,'La balise viewport n’a pas été détectée dans le HTML lu. Vérifier le rendu mobile ; ce signal seul ne prouve pas que le site est inutilisable.','Balise viewport détectée.',null,'Lecture du site');
        const socials=(si.socials||[]).filter(x=>x&&x.url);
        add('seo','Réseaux sociaux reliés',socials.length>0,6,'Aucun lien de réseau social n’a été détecté dans les pages analysées. Vérifier les liens du pied de page et les profils officiels.','Au moins un lien social détecté.',Math.min(1,socials.length/2),'Lecture du site');
      }
       if(googlePlaceId&&d.photoCount!=null&&Number.isFinite(Number(d.photoCount))){const n=Number(d.photoCount),pv=tier(n,[[10,1],[5,0.8],[1,0.4],[0,0]]);add('seo','Photos sur la fiche Google',n>=5,6,'Nombre de photos récupéré : '+n+'. Vérifier la qualité et la récence, pas seulement le volume.','Nombre de photos récupéré : '+n+'.',pv,'Google Places');}
      if(si&&si.booking!=null) add('seo','Prise de contact en ligne',!!((si.booking&&si.booking.length)||si.whatsapp),4,'Aucun parcours de réservation ou contact direct n’a été détecté sur la page analysée.','Un moyen de prise de contact directe a été détecté.',null,'Lecture du site');
      if(si&&si.rankings&&si.rankings.some(r=>!r.error)){
        const usable=si.rankings.filter(r=>!r.error),n=usable.length,topN=usable.filter(r=>r.pos!=null&&r.pos<=10).length,top3=usable.filter(r=>r.pos!=null&&r.pos<=3).length,foundN=usable.filter(r=>r.found).length;
        const rv=n?Math.max(top3/n,(topN*0.7+foundN*0.3)/n):null;
        add('seo','Présence sur les mots-clés explorés',n?topN>=1:null,10,n?'Le site ou le nom n’a pas été retrouvé dans les dix premiers résultats de l’échantillon exploré. Ce n’est pas une mesure du classement Google Maps.':'Aucun mot-clé mesurable.','Présence retrouvée dans '+foundN+'/'+n+' recherches explorées.',rv,'Recherche web indicative');
      }
      // GEO : critères sur le contenu uniquement lorsque la page a été lue, autres données selon leur source.
      add('geo','Établissement identifié dans Google Places',hasGoogle,16,'Aucun identifiant Google Places n’est associé à ce dossier. Cela ne prouve pas que l’établissement est absent de Google.','Établissement associé dans Google Places.',null,'Google Places');
      if(page){
        const schema=!!si.localSchema, sv=schema?1:((si.ldTypes||[]).length?0.4:0);
        add('geo','Données structurées LocalBusiness',schema,20,'Aucun schéma LocalBusiness n’a été détecté sur la page lue. Vérifier aussi les données structurées sur les autres pages pertinentes.','Données structurées LocalBusiness détectées.',sv,'Lecture du site');
        const words=Number(si.words)||0,wv=tier(words,[[300,1],[150,0.7],[60,0.4],[0,0.1]]);
        add('geo','Contenu lisible sur la page',words>=150,10,'La page lue contient '+words+' mots environ. Vérifier les pages de services avant d’en conclure que tout le site est pauvre en contenu.','Texte détecté sur la page : '+words+' mots environ.',wv,'Lecture du site');
        const info=(si.addressOnSite&&si.hoursOnSite)?1:(si.addressOnSite||si.hoursOnSite)?0.5:0;
        add('geo','Adresse et horaires en clair',!!(si.addressOnSite&&si.hoursOnSite),10,'L’adresse ou les horaires n’ont pas été détectés dans le texte de cette page.','Adresse et horaires détectés dans le texte.',info,'Lecture du site');
        const dg=v=>String(v||'').replace(/\D/g,'').replace(/^33/,'0').slice(-9);
        const g=dg(phone), tels=(Array.isArray(si.tel)?si.tel:[si.tel]).filter(Boolean).map(dg), same=!!(g&&tels.some(t=>t&&t===g));
        if(g&&tels.length) add('geo','Cohérence du téléphone',same,8,same?'':'Le téléphone de la fiche ne correspond pas à celui détecté sur la page.',same?'Téléphone identique dans les deux sources.':'Téléphones différents : vérifier les deux sources.',same?1:0,'Fiche client + site');
        else add('geo','Cohérence du téléphone',null,8,'La comparaison du téléphone n’est pas possible, car une des sources ne fournit pas de numéro.','Numéros comparables et cohérents.',null,'Fiche client + site');
        if(si.title){
          const nz=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const city=nz(c&&c.city),okCity=!!(city&&nz(si.title).includes(city));
          add('seo','Ville dans le titre',okCity,4,'La ville du commerce n’a pas été retrouvée dans le titre de page.','La ville du commerce figure dans le titre.',null,'Lecture du site');
        }
        add('geo','Description claire',!!si.metaDesc,8,'Aucune meta-description n’a été détectée sur la page lue.','Meta-description détectée.',null,'Lecture du site');
      }
      if(reviews!=null){const rv=tier(reviews,[[50,1],[20,0.85],[10,0.6],[3,0.3],[0,0.1]]);add('geo','Avis publics',reviews>=20,12,'Le volume public observé est de '+reviews+' avis. Le volume seul ne mesure ni la satisfaction ni la qualité des réponses.','Volume public observé : '+reviews+' avis.',rv,'Google Places');}
      else add('geo','Avis publics',null,12,'Le nombre d’avis n’est pas disponible.','Nombre d’avis disponible.',null,'Google Places');
      if(si){
        const dirs=Array.isArray(si.directories)?si.directories:[];
        const dv=tier(dirs.length,[[3,1],[2,0.7],[1,0.4],[0,0]]);
        add('geo','Présence dans les annuaires détectés',dirs.length>=2,10,'Moins de deux annuaires ont été détectés dans les sources consultées. Il s’agit d’un échantillon et non d’un recensement complet.','Annuaire(s) détecté(s) : '+dirs.length+'.',dv,'Recherche web');
        add('geo','Présence sur plusieurs réseaux',major>=2,6,'Moins de deux profils parmi Instagram, Facebook, TikTok et YouTube ont été détectés. Vérifier les profils officiels avant de conclure.','Profils de réseaux principaux détectés : '+major+'.',Math.min(1,major/2),'Site + recherche web');
      }
      if(d.sirene&&d.sirene.matched) add('geo','Entreprise présente dans SIRENE',true,6,'','Identité trouvée dans le registre SIRENE.',1,'Registre officiel');
      const gx=page&&si.geo;
      if(gx&&gx.robots&&Array.isArray(gx.robots.blocked)){
        const blocked=gx.robots.blocked.length,total=Math.max(1,Number(gx.robots.total)||1),v=1-blocked/total;
        add('geo','Robots IA et robots.txt',blocked===0,8,blocked?'Des robots IA sont listés comme bloqués par le fichier robots.txt. Vérifier les directives et les objectifs du site.':'','Robots listés comme non bloqués.',v,'robots.txt lu');
      }
      if(gx&&gx.llms!=null) add('geo','Fichier llms.txt',!!gx.llms,3,'Aucun fichier llms.txt exploitable n’a été trouvé. Ce fichier est facultatif et son absence ne constitue pas à elle seule une anomalie SEO.','Fichier llms.txt exploitable détecté.',null,'Fichier llms.txt');
      if(gx&&gx.faq!=null) add('geo','FAQ détectée',!!gx.faq,5,'Aucune FAQ détectée sur la page analysée. Une FAQ n’est pertinente que si elle répond à de vraies questions des clients.','FAQ détectée sur la page.',null,'Lecture du site');
      if(gx&&gx.lists!=null) add('geo','Contenu structuré',!!gx.lists,3,'Peu de listes ou de tableaux détectés sur la page.','Listes ou tableau détectés.',null,'Lecture du site');
      if(gx&&gx.digits!=null) add('geo','Informations concrètes',Number(gx.digits)>=5,3,'Peu de nombres concrets détectés sur cette page.','Informations chiffrées détectées : '+gx.digits+'.',Number(gx.digits)>=5?1:Number(gx.digits)>=2?0.5:0,'Lecture du site');
      if(gx&&gx.dated!=null) add('geo','Date de mise à jour lisible',!!gx.dated,2,'Aucune date de publication ou de mise à jour n’a été détectée sur cette page.','Date de publication ou de mise à jour détectée.',null,'Lecture du site');
      const pill=p=>{
        const it=items.filter(x=>x.pillar===p&&x.measured),total=it.reduce((n,x)=>n+x.weight,0),earned=it.reduce((n,x)=>n+x.weight*(x.val==null?(x.ok?1:0):x.val),0);
        const all=items.filter(x=>x.pillar===p),measuredWeight=total,possibleWeight=all.reduce((n,x)=>n+x.weight,0);
        const unmeasuredW=all.filter(x=>!x.measured).reduce((n,x)=>n+x.weight,0);const low=possibleWeight?Math.round(earned/possibleWeight*100):null;const high=possibleWeight?Math.round((earned+unmeasuredW)/possibleWeight*100):null;return {score:total?Math.round(earned/total*100):null,low,high,have:it.filter(x=>x.ok),miss:it.filter(x=>x.ok===false),items:all,measuredCount:it.length,totalCount:all.length,coverage:possibleWeight?Math.round(measuredWeight/possibleWeight*100):0,measuredWeight,possibleWeight};
      };
      const seoP=pill('seo'),geoP=pill('geo'),valid=[seoP,geoP].filter(p=>p.score!=null&&p.measuredCount>0);
      const index=valid.length?Math.round(valid.reduce((n,p)=>n+p.score,0)/valid.length):null;
      const measuredItems=items.filter(x=>x.measured),strengths=measuredItems.filter(x=>x.ok===true),weaknesses=measuredItems.filter(x=>x.ok===false&&x.gap);
      const categories = AUDIT_CATEGORY_META.map(meta => categorySummary(meta, meta.id === 'context' ? contextEvidence(a,c).map(x => ({ ...x, measured: x.status === 'measured', ok: null, weight: 0 })) : items.filter(x => x.category === meta.id)));
       return {items,categories,seo:seoP,geo:geoP,index,strengths,weaknesses,measuredCount:measuredItems.length,totalCount:items.length,coverage:items.length?Math.round(measuredItems.length/items.length*100):0,hasScore:index!=null,scoreRange:valid.length?{low:Math.round(valid.reduce((n,p)=>n+(p.low||0),0)/valid.length),high:Math.round(valid.reduce((n,p)=>n+(p.high||0),0)/valid.length)}:null};
    }

export function visibilityVerdict(i,diag){
      if(i==null||!Number.isFinite(Number(i)))return 'Score indisponible : les données mesurées sont insuffisantes pour conclure.';
      const cover=diag&&diag.coverage!=null?diag.coverage:null;
      const base=i>=75?'Bonne présence sur les critères mesurés, avec des optimisations possibles.':i>=50?'Présence perfectible : plusieurs améliorations sont identifiables dans les mesures disponibles.':i>=25?'Présence fragile sur les critères vérifiés : des actions prioritaires sont à examiner.':'Présence limitée sur les critères vérifiés : confirmez les données et traitez les points prioritaires.';
      return cover!=null&&cover<60?base+' Confiance limitée : seuls '+cover+' % des contrôles ont pu être mesurés.':base;
    }

export function actionPlan(a,c,diag){
      const rank={'Haute':0,'Moyenne':1,'À planifier':2};
      return auditActions(a,c,diag).map(x=>({
        t:x.label,
        d:x.advice,
        p:x.impact==='Élevé'?'Haute':x.impact==='Moyen'?'Moyenne':'À planifier',
        axis:x.axis
      })).sort((x,y)=>(rank[x.p]??3)-(rank[y.p]??3)).slice(0,10);
    }

export function visibilityLabel(i){ return i>=70?{t:'Bonne visibilité',c:'ok'}:i>=45?{t:'Visibilité moyenne',c:'mid'}:{t:'Mauvaise visibilité',c:'bad'}; }

export function auditUnmeasured(a,c){
      const d=(c&&c.details)||{}; const si=a&&a.site; const s=a&&a.scan;
      const site=String((c&&c.website)||d.website||'').trim(); const um=[];
      if(site&&si&&!si.pageRead) um.push({label:'Contenu du site (8 vérifications)',why:'la page n’a pas pu être lue (site inaccessible ou lecture refusée)',n:8});
      if(site&&si&&si.pageRead&&!(si.geo&&si.geo.robots)) um.push({label:'Fichiers lus par les IA (robots.txt, llms.txt)',why:si.geo?'les fichiers n’ont pas pu être lus':'mesure ajoutée récemment : relancer l’analyse',n:2});
      if(site&&!(s&&s.scores&&s.scores.performance!=null)) um.push({label:'Performance mobile et SEO technique',why:'Google PageSpeed n’a pas répondu',n:2});
      if(!(si&&si.rankings&&si.rankings.some(r=>!r.error))) um.push({label:'Classement sur les mots-clés',why:si?'la recherche web n’a pas répondu':'analyse complète non lancée',n:1});
      if(d.photoCount==null) um.push({label:'Photos de la fiche Google',why:'nombre non fourni par Google pour ce commerce',n:1});
      if(!si) um.push({label:'Présence web (annuaires, réseaux)',why:'analyse complète non lancée',n:2});
      um.push({label:'Publications Google et questions/réponses',why:'non diffusées par l’API officielle de Google : jamais comptées comme un défaut',n:0});
      return um;
    }

export function auditActions(a,c,diag){
      const d=(c&&c.details)||{}, site=String((c&&c.website)||d.website||'').trim();
      const weights={seo:0,geo:0};
      (diag.items||[]).filter(x=>x.measured).forEach(x=>{weights[x.pillar]=(weights[x.pillar]||0)+x.weight;});
      const effort=l=>/Note Google|Volume d’avis|Avis publics/.test(l)?'Continu':/^Site web$|Performance mobile|Classement|Contenu lisible|Référencement technique/.test(l)?'Projet':/Données structurées|annuaires|multi-réseaux|Prise de contact|Infos clés|Balises/.test(l)?'1 h':'15 min';
      const where=l=>/Fiche Google|Note Google|avis|Horaires|Téléphone|Photos|Présence reconnue/i.test(l)?{href:'https://business.google.com/',t:'Ouvrir Google Business'}:(site&&!/^Site web$/.test(l)&&/Site|Balises|Compatible|Réseaux sociaux|Données structurées|Contenu|Infos clés|Cohérence|Description|Performance|Référencement|Prise de contact|HTTPS|Fichier llms|robots/i.test(l))?{href:site,t:'Ouvrir le site'}:null;
      const fromDiagnostic=(diag.items||[]).filter(x=>x.measured&&x.ok===false&&x.gap).map(x=>{
        const denominator=Math.max(1,weights[x.pillar]||0);
        const gain=Math.round(x.weight*(1-(x.val==null?0:x.val))/denominator*500)/10;
        const ef=effort(x.label);
        return {label:x.label,advice:x.gap,axis:x.pillar==='geo'?'GEO':'SEO',gain,impact:gain>=4?'Élevé':gain>=2?'Moyen':'Faible',effort:ef,quick:(ef==='15 min'||ef==='1 h')&&gain>=1.5,where:where(x.label),source:x.source||'Diagnostic'};
      });
      // Recommandations Lighthouse qui dupliquent un critère déjà pris en charge par le diagnostic sont écartées.
      const scan=a&&a.scan, scanRecs=(scan&&Array.isArray(scan.recommendations)?scan.recommendations:[]);
      const canonical=[
        [/performance|largest contentful paint|first contentful paint|cumulative layout shift|speed index|blocking time/i,'Performance mobile'],
        [/meta description|title element|document has a title|seo/i,'Référencement technique (Lighthouse)'],
        [/viewport|tap targets|font sizes/i,'Compatible mobile'],
        [/https|http requests/i,'Adresse du site en HTTPS'],
        [/accessibility|contrast|aria|label/i,'Accessibilité']
      ];
      const already=new Set(fromDiagnostic.map(x=>x.label.toLowerCase()));
      const extras=[];
      scanRecs.forEach(r=>{
        const title=String(r.title||'').trim(); if(!title)return;
        const match=canonical.find(([rx])=>rx.test(title));
        const label=match?match[1]:title;
        if(already.has(label.toLowerCase())||extras.some(x=>x.label.toLowerCase()===label.toLowerCase()))return;
        const sev=String(r.severity||'').toLowerCase();
        extras.push({label,advice:String(r.detail||'Vérifier ce point dans le rapport Lighthouse.'),axis:'SEO',gain:null,impact:sev==='haute'?'Élevé':'À vérifier',effort:'À estimer',quick:false,where:site?{href:site,t:'Ouvrir le site'}:null,source:'Google Lighthouse'});
        already.add(label.toLowerCase());
      });
      return fromDiagnostic.concat(extras).sort((p,q)=>{
        const impact={Élevé:3,Moyen:2,Faible:1,'À vérifier':0};
        return (impact[q.impact]||0)-(impact[p.impact]||0)||(Number(q.gain)||0)-(Number(p.gain)||0);
      });
    }

export function auditHasAnalysis(a){
      // A checklist completed by hand is not the same thing as an evidence-backed analysis.
      return !!(a&&(a.scan||a.site||a.status==='Analysé'));
    }
