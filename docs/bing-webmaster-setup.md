# Connexion Bing Webmaster Tools à AuditIA

## 1. Préparer Bing

1. Ouvrir [Bing Webmaster Tools](https://www.bing.com/webmasters/).
2. Ajouter et vérifier le site dans le compte Microsoft concerné.
3. Dans **Paramètres → API Access**, accepter les conditions Bing puis générer la clé API.
4. Ne pas envoyer cette clé par e-mail, chat ou formulaire public.

Bing indique que la clé API est associée au compte Bing de l'utilisateur, et non à un seul site. L'accès aux données reste limité aux propriétés vérifiées dans ce compte. Voir la [documentation officielle Microsoft sur l'accès à l'API](https://learn.microsoft.com/en-us/bingwebmaster/getting-access).

## 2. Enregistrer la clé dans AuditIA

1. Se connecter à AuditIA avec le compte administrateur.
2. Ouvrir **Réglages → API et intégrations → Bing Webmaster Tools**.
3. Coller la clé, puis cliquer **Enregistrer les intégrations**.
4. La clé est enregistrée dans `app_settings` et n'est accessible au navigateur qu'à travers un état masqué (présence/indice). Les appels Bing passent par l'Edge Function `auditia-secure-api`.

La clé ne doit jamais être ajoutée à un fichier HTML, JavaScript, une variable `VITE_` ou un commit Git.

## 3. Voir les données d'un client

- Vérifier que le client possède une adresse de site dans sa fiche AuditIA.
- Cette adresse doit correspondre à une propriété vérifiée dans le compte Bing relié à la clé.
- Ouvrir la fiche du client et cliquer **Charger les données Bing**.
- AuditIA affiche les clics et impressions renvoyés par Bing, sans fabriquer de classement ou de métrique manquante.

Si Bing renvoie une propriété non vérifiée ou aucune statistique, AuditIA l'indique. Les données peuvent prendre du temps à apparaître après l'ajout/vérification du site.

## Sécurité et limites

- L'intégration est en lecture seule : elle ne soumet aucune URL et ne modifie pas la configuration Bing.
- Seul le compte administrateur AuditIA peut déclencher l'appel, selon la vérification d'identité déjà appliquée à l'Edge Function.
- L'Edge Function vérifie que la propriété demandée est vérifiée dans le compte Bing avant d'interroger les statistiques.
- Les appels sont limités par utilisateur, par minute et par jour.
- Bing peut retourner zéro résultat si la propriété vient d'être ajoutée ou si elle ne dispose pas encore de données. Ce n'est pas interprété comme un score nul.