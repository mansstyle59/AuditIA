/* AuditIA — modèle de données Google Places : normalisation d'une fiche, catégorie, ville, score d'opportunité,
   interprétation d'une recherche en langage naturel. Fonctions pures, déplacées telles quelles depuis site/index.html (étape 2).
   Les appels réseau (fetch Places) restent pour l'instant dans index.html : ils dépendent de l'état de l'interface. */
export function mapCategory(primary, types){
      const t=((primary||'')+' '+((types||[]).join(' '))).toLowerCase();
      const has=(...ks)=>ks.some(k=>t.includes(k));
      if(has('lodging','hotel','motel','guest','hostel','bed_and_breakfast','campground')) return 'Hébergement';
      if(has('car_dealer','car_repair','car_wash','gas_station','auto_parts','automotive')) return 'Automobile';
      if(has('beauty','hair','spa','nail','barber','wellness')) return 'Beauté & bien-être';
      if(has('restaurant','cafe','bar','bakery','meal_','food','coffee','pub','brasserie','pizza','pâtiss','patiss')) return 'Restaurant';
      if(has('plumb','electric','paint','locksmith','roof','contractor','carpenter','mason','artisan','repair','construction')) return 'Artisan';
      if(has('store','shop','market','supermarket','grocery','boutique','mall','pharmacy','florist','retail')) return 'Commerce';
      return 'Autre';
    }

export function cityFromComponents(comps){
      if(!Array.isArray(comps)) return '';
      const pick=t=>{const x=comps.find(c=>(c.types||[]).includes(t));return x?(x.longText||x.long_name||''):'';};
      return pick('locality')||pick('postal_town')||pick('administrative_area_level_2')||'';
    }


/* Un nombre d'avis absent ou mal formé reste non mesuré ; seul un zéro explicite vaut zéro. */
export function normalizeReviewCount(value){
  if(value===null||value===undefined||value==='') return null;
  if(typeof value!=='number'&&typeof value!=='string') return null;
  if(typeof value==='string'&&value.trim()==='') return null;
  const n=typeof value==='number'?value:Number(value.trim());
  return Number.isSafeInteger(n)&&n>=0?n:null;
}

/* Classement par volume d'avis observé : les commerces sans compteur connu restent non classés. */
export function rankByReviewEvidence(rows){
  const sorted=(Array.isArray(rows)?rows:[]).map(row=>({...row,reviews:normalizeReviewCount(row.reviews)}));
  sorted.sort((a,b)=>{
    if(a.reviews===null&&b.reviews!==null) return 1;
    if(a.reviews!==null&&b.reviews===null) return -1;
    if(a.reviews!==null&&b.reviews!==null&&a.reviews!==b.reviews) return b.reviews-a.reviews;
    const ar=Number.isFinite(a.rating)?a.rating:null;
    const br=Number.isFinite(b.rating)?b.rating:null;
    if(ar!==br){ if(ar===null) return 1; if(br===null) return -1; return br-ar; }
    return String(a.name||'').localeCompare(String(b.name||''),'fr');
  });
  let rank=0;
  return sorted.map(row=>({...row,rank:row.reviews===null?null:++rank}));
}

export function normalizePlace(p){
      let website=p.websiteUri||''; if(website&&!/^https?:\/\//i.test(website)) website='https://'+website;
      return { placeId:p.id, name:(p.displayName&&p.displayName.text)||'', address:p.formattedAddress||'',
        city:cityFromComponents(p.addressComponents), category:mapCategory(p.primaryType,p.types),
        primaryType:p.primaryType||'', phone:p.nationalPhoneNumber||'', website:website,
        rating:typeof p.rating==='number'?p.rating:null, reviews:normalizeReviewCount(p.userRatingCount),
        status:p.businessStatus||'', hours:(p.regularOpeningHours&&p.regularOpeningHours.weekdayDescriptions)||null,
        summary:(p.editorialSummary&&p.editorialSummary.text)||'', photoCount:Array.isArray(p.photos)?p.photos.length:null };
    }

export function nearbyOpportunity(p){
      const reasons=[]; let score=0;
      if(!p.website){score+=35;reasons.push('aucun site web trouvé dans Google Places');}
      if(!Array.isArray(p.hours)||!p.hours.length){score+=15;reasons.push('horaires non renseignés dans la fiche');}
      if(p.rating==null){score+=15;reasons.push('note Google indisponible');}
      else if(p.rating<4){score+=20;reasons.push('note Google sous 4/5');}
      const reviews=normalizeReviewCount(p.reviews);
      if(reviews!==null&&reviews<10){score+=15;reasons.push('moins de 10 avis Google');}
      else if(reviews!==null&&reviews<30){score+=8;reasons.push('moins de 30 avis Google');}
      if(p.status==='CLOSED_PERMANENTLY'){score=0;reasons.splice(0,reasons.length,'établissement signalé fermé définitivement');}
      return {score:Math.min(100,score),reasons:reasons.slice(0,3),closed:p.status==='CLOSED_PERMANENTLY'};
    }

export function parseNaturalLanguageTarget(raw){
      const text=String(raw||'').trim();
      const low=text.toLocaleLowerCase('fr-FR');
      const rules=[
        {re:/\b(coiffeur|coiffeurs|salon de coiffure|salons de coiffure)\b/i,type:'hair_salon'},
        {re:/\b(plombier|plombiers|plomberie)\b/i,type:'plumber'},
        {re:/\b(électricien|électriciens|electricien|electriciens)\b/i,type:'electrician'},
        {re:/\b(restaurant|restaurants|restauration)\b/i,type:'restaurant'},
        {re:/\b(boulangerie|boulangeries|boulanger|boulangers)\b/i,type:'bakery'},
        {re:/\b(garage|garages|mécanicien|mécaniciens|mecanicien|mecaniciens)\b/i,type:'car_repair'},
        {re:/\b(agence immobilière|agences immobilières|agent immobilier|agents immobiliers)\b/i,type:'real_estate_agency'},
        {re:/\b(institut de beauté|instituts de beauté|esthéticienne|esthéticiennes)\b/i,type:'beauty_salon'},
        {re:/\b(hôtel|hôtels|hotel|hotels)\b/i,type:'hotel'},
        {re:/\b(fleuriste|fleuristes)\b/i,type:'florist'},
        {re:/\b(pharmacie|pharmacies)\b/i,type:'pharmacy'},
        {re:/\b(salle de sport|salles de sport|fitness)\b/i,type:'gym'},
        {re:/\b(café|cafés|cafe|cafes)\b/i,type:'cafe'},
        {re:/\b(avocat|avocats|cabinet d'avocats)\b/i,type:'lawyer'}
      ];
      const matched=rules.find(r=>r.re.test(low));
      const noWebsite=/sans site|sans (?:un )?site web|n'ont pas de site|n’ont pas de site|pas de site web|site web absent/i.test(low);
      const lowRating=/note(?: google)? (?:inférieure|sous|en dessous de) 4|moins de 4(?:[,.]0)?\s*(?:\/5|sur 5)?|mal notés|mal note[s]?/i.test(low);
      const minReviews=low.match(/(?:plus de|au moins)\s*(\d+)\s*avis/i);
      let query=text;
      query=query.replace(/\b(avec|qui ont|ayant)\s+(?:un |une )?site web\b/ig,'');
      query=query.replace(/\b(sans|qui n'ont pas de|qui n’ont pas de|pas de)\s+(?:un |de )?site(?: web)?\b/ig,'');
      query=query.replace(/\b(note(?: google)? (?:inférieure|sous|en dessous de) 4|moins de 4(?:[,.]0)?\s*(?:\/5|sur 5)?|mal notés|mal note[s]?)\b/ig,'');
      query=query.replace(/\b(?:plus de|au moins)\s*\d+\s*avis\b/ig,'');
      query=query.replace(/\s+/g,' ').trim();
      return {query:query||text,type:matched&&matched.type,noWebsite,lowRating,minReviews:minReviews?Number(minReviews[1]):0,raw:text};
    }
