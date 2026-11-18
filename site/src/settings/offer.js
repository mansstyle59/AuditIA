// AuditIA — offre commerciale affichée à la fin du rapport PDF (page « Proposition »).
// Pour changer un tarif ou un texte, modifier uniquement ce fichier. Règle : jamais de promesse de résultat.

export const OFFER = {
  enabled: true,
  title: 'Pour passer à l’action',
  intro: 'Voici comment je peux vous accompagner à partir de ce rapport. Les actions décrites reposent sur des données publiques ; aucun résultat n’est garanti.',
  audit: {
    name: '1. Ce rapport',
    price: '',
    sub: 'Déjà réalisé',
    items: ['Audit de votre visibilité sur Google et auprès des assistants IA, avec un plan d’action classé par priorité.'],
  },
  visibility: {
    name: '2. Mise en visibilité',
    price: '90 €',
    sub: 'Une seule fois, après l’audit',
    lead: 'Mise en place des actions prioritaires de ce rapport, par exemple :',
    maxActions: 4,
  },
  followUp: {
    name: '3. Suivi mensuel',
    price: '20 €/mois',
    sub: 'Pour garder le cap',
    items: [
      'Un contrôle de votre visibilité chaque mois, comparé au précédent.',
      'De l’aide sur vos réseaux sociaux.',
      'Des conseils pour votre site vitrine.',
    ],
  },
  footer: 'Mes coordonnées figurent à la dernière page du rapport.',
};

/* Cartes de l'offre prêtes à dessiner, à partir du plan d'action du rapport (m.plan). Fonction pure. */
export function offerCards(plan, offer = OFFER) {
  if (!offer || !offer.enabled) return [];
  const actions = (Array.isArray(plan) ? plan : []).map(x => String(x && x.title || '').trim()).filter(Boolean).slice(0, offer.visibility.maxActions);
  return [
    { ...offer.audit, tone: 'good' },
    { name: offer.visibility.name, price: offer.visibility.price, sub: offer.visibility.sub, tone: 'primary',
      items: actions.length ? [offer.visibility.lead, ...actions] : [offer.visibility.lead.replace(/, par exemple :$/, '.')],
      nested: actions.length ? 1 : 0 },
    { ...offer.followUp, tone: 'primary' },
  ];
}
