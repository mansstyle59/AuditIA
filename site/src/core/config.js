/* AuditIA — configuration et constantes (étape 2).
   La clé « publishable » Supabase est publique par conception (RLS la protège) ; aucun secret ici. */
export const SUPABASE_URL = 'https://vkerjefkaxcohwhdwccq.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J9FosHeYMdbYdbwOFfrUDw_WKhI7dXI';

export const ADMIN_EMAIL = 'dewulf.denis@gmail.com';

export const checklistTemplate = [
      ['Présence en ligne','Le commerce est facilement trouvable sur le web'],
      ['Fiche établissement','Coordonnées, horaires et catégorie sont cohérents'],
      ['Avis clients','Les avis récents sont suivis et reçoivent une réponse'],
      ['Site web','Le site est accessible et adapté au mobile'],
      ['Contact','Téléphone, adresse et liens fonctionnent'],
      ['Réseaux sociaux','Les profils sont actifs et à jour'],
      ['Identité visuelle','Logo, photos et informations sont cohérents'],
      ['Informations locales','Ville, zone desservie et services sont clairs']
    ];

export const KEY_NAMES = { logo_dev:'Logo.dev', places:'Google Places', maps:'Google Maps', pagespeed:'PageSpeed' };

export const defaultSettings = () => ({company_name:'AffiAds',app_name:'AuditIA',tagline:'Auditer mieux, décider plus clairement',contact_email:'Dewulf.denis@gmail.com',phone:'',website:'',address:'',signature_name:'Denis Dewulf',signature_role:'Audit & conseil en visibilité numérique',signature_text:'Merci pour votre confiance.',logo_data_url:'',primary_color:'#5B5FEF',accent_color:'#ffad72',google_places_api_key:'',google_maps_api_key:'',pagespeed_api_key:'',search_console_property:'',google_business_profile_url:'',bing_webmaster_api_key:'',openai_api_key:'',logo_dev_publishable_key:'',integrations_notes:''});

export const API_FIELD = { logo_dev:'logo_dev_publishable_key', places:'google_places_api_key', maps:'google_maps_api_key', pagespeed:'pagespeed_api_key', bing:'bing_webmaster_api_key', openai:'openai_api_key', search_console:'search_console_property', business:'google_business_profile_url' };

export const API_MODE = { logo_dev:'net', places:'net', maps:'net', pagespeed:'net', bing:'format', openai:'format', search_console:'format', business:'format' };
