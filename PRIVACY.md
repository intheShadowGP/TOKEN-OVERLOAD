# Confidentialité — TOKEN OVERLOAD

**En bref : le jeu ne vous demande rien, ne collecte rien et n'envoie rien.**

## Ce qui n'existe pas

- Pas d'inscription, de compte, de connexion ni de mot de passe.
- Pas de connexion via un réseau social.
- Aucune donnée personnelle demandée : ni nom, ni prénom, ni e-mail, ni téléphone, ni adresse, ni date de naissance, ni localisation, ni information bancaire.
- Pas de télémétrie, de mesure d'audience, de publicité, de pixel de suivi, d'empreinte numérique (*fingerprinting*) ni de remontée automatique d'erreurs.
- Pas de classement en ligne ni de synchronisation dans le cloud.
- Pas de cookie.

## Ce qui est stocké, et où

Votre progression est enregistrée **uniquement dans votre navigateur, sur votre appareil** (`localStorage`), sous les clés :

- `token-overload:save` — la partie ;
- `token-overload:save:backup` — la copie de secours (sauvegarde précédente) ;
- `token-overload:save:corrupted` — seulement si une sauvegarde illisible a dû être mise de côté.

Ces données contiennent exclusivement des informations de jeu : tokens, infrastructures et améliorations achetées, statistiques (clics, tokens générés, temps de jeu…), grades, succès, renaissances, journal des événements du jeu, paramètres (son, animations, format des nombres…). Aucune frappe clavier ni interaction en dehors du jeu n'est enregistrée.

Elles ne quittent jamais votre appareil : la politique de sécurité du contenu du jeu interdit toute connexion réseau sortante. Elles ne sont **pas synchronisées** entre vos appareils ou navigateurs.

## Vos contrôles

Dans **Paramètres → Sauvegarde** :

- **Exporter** votre partie dans un fichier JSON (que vous gardez où vous voulez) ;
- **Importer** une partie exportée — le fichier est lu et vérifié localement, jamais envoyé ;
- **Réinitialiser complètement** — supprime définitivement toutes les données du jeu de ce navigateur.

Effacer les données de navigation du site dans votre navigateur supprime aussi la partie.

## Hébergement

Les fichiers du jeu (HTML, CSS, JavaScript, polices) sont hébergés publiquement sur GitHub Pages. Comme tout serveur web, l'hébergeur reçoit les requêtes techniques nécessaires au téléchargement de ces fichiers (adresse IP, navigateur) et peut les journaliser selon sa propre politique de confidentialité. Le jeu lui-même n'ajoute aucune collecte.

## Limites

Nous appliquons la minimisation des données et des protections techniques strictes, mais aucun système n'est sûr à 100 %. Par exemple, une extension de navigateur ou un logiciel installé sur votre appareil peut accéder au stockage local du navigateur.
