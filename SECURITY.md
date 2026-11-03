# Sécurité — TOKEN OVERLOAD

TOKEN OVERLOAD est conçu *Security by Design* et *Privacy by Design* : un jeu entièrement statique, sans serveur applicatif, sans compte et sans donnée personnelle. Ce document décrit les mesures en place et leurs limites.

## Surface d'attaque

- Aucun backend, aucune API, aucune base de données, aucune authentification.
- Aucune dépendance JavaScript tierce, aucun CDN : polices, icônes et sons sont locaux (les sons sont synthétisés à la volée par Web Audio).
- Aucune requête réseau après le chargement des fichiers du jeu.
- Seule entrée de données externe : le fichier de sauvegarde importé volontairement par le joueur.

## Mesures

### Politique de sécurité du contenu (CSP)

Déclarée dans `index.html` (GitHub Pages ne permet pas d'en-têtes personnalisés) :

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self';
manifest-src 'self'; connect-src 'none'; media-src 'none'; object-src 'none'; worker-src 'none';
child-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';
require-trusted-types-for 'script'; trusted-types 'none'
```

- `connect-src 'none'` : aucune connexion sortante possible (fetch, XHR, WebSocket, beacon).
- Ni `unsafe-inline` ni `unsafe-eval` : aucun script ni style inline, aucun gestionnaire `on…=` dans le HTML.
- Trusted Types imposés sans aucune politique : toute affectation de chaîne à `innerHTML` ou équivalent est bloquée par le navigateur. L'interface construit le DOM avec `createElement` et `textContent` uniquement.
- Sur un hébergeur qui accepte les en-têtes HTTP (Cloudflare Pages, Netlify, serveur dédié), ajouter en plus `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Permissions-Policy` (caméra, micro, géolocalisation… désactivés), COOP/COEP/CORP et HSTS. Le jeu a été testé avec l’ensemble de ces en-têtes actifs.

### Code

- Pas de `eval()`, de `new Function()`, de `setTimeout` avec chaîne, ni d'import dynamique de données.
- Aucune clé API, aucun secret, aucune URL tierce dans le code.
- Aucune permission navigateur demandée (caméra, micro, géolocalisation, notifications, presse-papiers en lecture…). Seule action système : l'écriture de l'export dans le presse-papiers, uniquement sur clic explicite du bouton « Copier ».
- L'import de fichier passe par le sélecteur natif du navigateur, à l'initiative du joueur ; le fichier est lu localement et n'est jamais transmis.

### Validation des sauvegardes (`js/core/storage.js`)

Toute sauvegarde — importée ou relue depuis le `localStorage` — est traitée comme non fiable :

1. Taille limitée à 256 Ko avant analyse.
2. `JSON.parse` uniquement (jamais d'exécution de code).
3. Format, version et empreinte d'intégrité (FNV-1a 32 bits) vérifiés. Une version plus récente que le jeu est refusée ; les plus anciennes passent par des migrations explicites.
4. Reconstruction champ par champ à partir d'un état par défaut : seules les clés connues sont lues, avec contrôle de type, de bornes, d'entiers et d'identifiants (une infrastructure inconnue est rejetée). Les clés comme `__proto__` ne peuvent pas polluer les prototypes.
5. Contrôles de cohérence : tokens ≤ tokens générés, clics, prérequis des améliorations, nombre de renaissances…
6. Les effets temporaires ne stockent qu'un identifiant et une échéance : leur multiplicateur vient toujours des données du jeu. Le grade est recalculé à partir des statistiques.
7. Import utilisateur : toute anomalie entraîne un refus avec message clair. Relecture locale : les champs abîmés sont corrigés ou ignorés, avec repli sur la copie de secours.
8. Les textes (journal) sont bornés en longueur, débarrassés des caractères de contrôle et affichés via `textContent`.

L'empreinte d'intégrité détecte une corruption ou une modification accidentelle ; ce n'est pas une signature cryptographique. Un joueur peut modifier sa propre sauvegarde et recalculer l'empreinte : c'est assumé pour un jeu solo sans classement, et la validation garantit que même une sauvegarde modifiée ne peut ni exécuter de code ni casser le jeu.

### Robustesse

- Arithmétique saturante : aucune valeur ne peut devenir `NaN`, négative ou `Infinity`.
- Stockage indisponible (navigation privée stricte, quota plein) : le jeu reste jouable et prévient le joueur.
- Les événements « négatifs » sont fictifs, temporaires et plafonnés (perte maximale : 5 % des tokens ou 2 minutes de production) ; ils ne touchent jamais aux statistiques historiques. Aucun événement ne fait de requête réseau, de scan ou d'interaction avec le système.

## Audit avant livraison

Vérifications effectuées pour cette version. Les contrôles automatisés (`audit:dist`) ont été exécutés sur les mêmes fichiers dans le pipeline de publication d’origine, qui analyse le site généré à la recherche de données personnelles, traceurs, hôtes externes, secrets, code inline et métadonnées.

| # | Contrôle | Méthode | Résultat |
| --- | --- | --- | --- |
| 1 | Pas de collecte de données personnelles | Revue du code et du HTML : aucun champ de saisie hors import de sauvegarde et réglages | OK |
| 2 | Pas de traceur | `audit:dist` (motifs de traceurs) + recherche manuelle | OK |
| 3 | Pas de requête vers des tiers | CSP `connect-src 'none'` ; audit des hôtes externes dans `dist/` ; onglet réseau du navigateur : uniquement des fichiers locaux | OK |
| 4 | Pas de secret dans le dépôt | `audit:dist` (motifs de secrets) + recherche manuelle | OK |
| 5 | Pas de donnée personnelle dans les fichiers | `audit:dist` (e-mails, téléphones, chemins locaux, nom du compte de la machine de build) ; favicon en SVG texte, aucune image matricielle | OK |
| 6 | Validation des imports | Tests `storage.test.mjs` + essais manuels (JSON invalide, empreinte fausse) dans le navigateur | OK |
| 7 | Protection contre l'injection HTML | Trusted Types imposés ; recherche d'`innerHTML`/`insertAdjacentHTML`/`document.write` : aucune occurrence | OK |
| 8 | Pas d'`eval()` | Recherche manuelle + `audit:dist` | OK |
| 9 | Fonctionnement hors connexion après chargement | Aucune ressource distante ; aucune requête après chargement | OK |
| 10 | Suppression effective des données locales | Test `wipeGame` (toutes les clés du jeu supprimées, les autres conservées) + essai navigateur | OK |
| 11 | CSP fonctionnelle | Jeu testé servi avec les en-têtes réels (CSP + Trusted Types) : aucune violation en console | OK |
| 12 | Pas de permission navigateur inutile | Aucune API soumise à permission n'est appelée | OK |

## Limites connues

- Les données de jeu sont stockées en clair dans le `localStorage`, accessible à toute extension de navigateur autorisée sur le site et à toute personne ayant accès à la session du navigateur. Elles ne contiennent aucune donnée personnelle.
- Sur GitHub Pages, les protections par en-têtes HTTP (`frame-ancestors`, `Permissions-Policy`, HSTS de domaine…) dépendent de l'hébergeur ; seule la CSP `<meta>` s'applique. Le jeu peut donc être affiché dans une iframe par un site tiers ; il ne contient aucune action sensible exploitable par *clickjacking*.
- L'hébergeur (GitHub) voit les requêtes de téléchargement des fichiers du jeu, comme tout serveur web.
- Aucune mesure n'est infaillible : ces protections réduisent les risques sans les supprimer.

## Signaler un problème

Ouvrez une *issue* sur le dépôt en décrivant le problème, sans y joindre de données personnelles.
