// AuditIA — DONNÉES DE DÉMONSTRATION UNIQUEMENT.
// Fichier fictif pour la maquette visuelle. Aucune donnée réelle, aucune lecture Supabase.
// À supprimer ou remplacer lors du branchement des fonctionnalités métier.
export const DEMO = {
  kpis: [
    { label: 'Audits ce mois', value: '12', hint: '+3 vs mois dernier' },
    { label: 'Score moyen', value: '68/100', hint: 'Sur 12 audits' },
    { label: 'Prospects à contacter', value: '8', hint: '2 nouveaux' },
    { label: 'Clients actifs', value: '5', hint: 'Démo' },
  ],
  audits: [
    { client: 'Boulangerie Dupont', meta: 'Carcassonne · 04/11/2026', score: 72 },
    { client: 'Garage Martin', meta: 'Lézignan · 03/11/2026', score: 41 },
    { client: 'Café du Port', meta: 'Narbonne · 01/11/2026', score: 88 },
    { client: 'Peinture Azille', meta: 'Azille · 30/10/2026', score: 55 },
  ],
  actions: [
    { label: 'Compléter la fiche Google Business', pct: 35 },
    { label: 'Ajouter des avis clients', pct: 60 },
    { label: 'Publier régulièrement sur Instagram', pct: 20 },
  ],
  distribution: [
    { label: '0 à 39', count: 3 },
    { label: '40 à 59', count: 4 },
    { label: '60 à 79', count: 3 },
    { label: '80 à 100', count: 2 },
  ],
};
