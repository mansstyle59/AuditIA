/* AuditIA — « Nouveautés » : lecture d'un enregistrement BODACC (créations d'entreprises) et normalisation des noms de ville.
   Fonctions pures, déplacées telles quelles depuis site/index.html (étape 2). */
export const nvNorm=x=>String(x||'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');

export function nvParse(x){
      let et={},ac={};
      try{et=(JSON.parse(x.listeetablissements||'{}')||{}).etablissement||{};}catch(_){}
      try{ac=JSON.parse(x.acte||'{}')||{};}catch(_){}
      const activity=String(et.activite||'').trim();
      const ad=et.adresse||{};
      const address=[ad.numeroVoie,ad.typeVoie,ad.nomVoie].filter(Boolean).join(' ');
      const start=ac.dateCommencementActivite||ac.dateImmatriculation||x.dateparution||'';
      const name=String(et.enseigne||et.nomCommercial||x.commercant||'').replace(/\s+/g,' ').trim();
      return {name:name,owner:String(x.commercant||'').trim(),city:String(x.ville||ad.ville||'').trim(),cp:String(x.cp||ad.codePostal||'').trim(),address:address,activity:activity,start:String(start).slice(0,10),url:x.url_complete||''};
    }
