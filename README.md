# TOKEN OVERLOAD

Jeu incrémental (*idle / clicker*) humoristique sur la consommation de tokens des intelligences artificielles. On commence avec le PC du CDI, on finit avec une Singularité informatique.

- 100 % statique : HTML, CSS et JavaScript (modules ES), sans dépendance, sans build.
- 100 % local : aucun compte, aucune requête réseau après le chargement, aucun traceur.
- Compatible GitHub Pages et sous-répertoires (tous les chemins sont relatifs).
- Chrome, Edge, Opera, Firefox (versions récentes) ; ordinateur, tablette, smartphone.

## Fonctionnalités

| Domaine | Contenu |
| --- | --- |
| Clic | Gros bouton token animé, particules, gains flottants, 1 token par clic au départ ; 15 améliorations de clic (valeur de base jusqu'à 500 M, ou % de la production) ; 3 auto-cliqueurs qui génèrent de vrais clics. |
| Production | 25 infrastructures en 5 paliers (Informatique basique → Technologies absurdes). Coût exponentiel `base × 1,15^n`, achat ×1 / ×10 / ×25 / Max, production ×2 à 25, 50, 100, 150, 200… exemplaires, temps d'amortissement affiché. |
| Grades | 12 grades (Noobie → Omniscience) selon les clusters achetés, les clics et les renaissances **cumulés sur toute la partie** ; barres de progression ; +10 % de production par grade. |
| Renaissance | Seuil de tokens générés dans la partie, avertissement, confirmation explicite, compte à rebours, distorsion et particules. Multiplicateur permanent `4^renaissances` sur le clic et la production. Jamais automatique. |
| Succès | 49 succès, chacun avec un bonus permanent (+1 à +10 %). |
| Événements | 20 événements aléatoires locaux : bonus, incidents (temporaires et plafonnés), rares, défensifs (patch, firewall, audit, sauvegarde immuable). |
| Statistiques | Partie en cours, historique, progression, graphique de production (échelle logarithmique), historique des renaissances, journal. |
| Sauvegarde | Automatique (15 s, achats, succès, fermeture de l'onglet), copie de secours, export/import JSON validé, réinitialisation complète. |
| Paramètres | Son et volume, particules, gains flottants, animations (selon le système / toutes / réduites), compte à rebours, format des nombres, événements, tutoriel. |

Les nombres s'affichent `1 000`, `1 M`, `1 Md`, `1 T`, `1 Qa`, puis en notation scientifique (`1,23e21`).

## Lancer le jeu en local

Les modules ES ne se chargent pas en `file://` : il faut un petit serveur HTTP. Depuis ce dossier :

```bash
python -m http.server 8000
```

puis ouvrir `http://localhost:8000/`.


## Publier sur GitHub Pages

Le workflow `.github/workflows/pages.yml` lance les tests à chaque push, puis publie uniquement les fichiers du jeu (sans `tests/` ni `package.json`).

1. Une seule fois : *Settings → Pages → Build and deployment → Source : GitHub Actions*.
2. Pousser sur `main` : le jeu est en ligne à `https://<utilisateur>.github.io/TOKEN-OVERLOAD/`.

Tous les chemins sont relatifs : le jeu fonctionne aussi bien à la racine d’un domaine que dans un sous-répertoire.

## Sauvegarder et restaurer une partie

- La partie est enregistrée automatiquement dans le `localStorage` du navigateur (clés `token-overload:save` et `token-overload:save:backup`). Elle survit à la fermeture du navigateur et au redémarrage de l'ordinateur, mais **reste sur cet appareil et ce navigateur**.
- **Exporter** : Paramètres → Sauvegarde → *Exporter (.json)* (ou *Copier*).
- **Restaurer** : Paramètres → Sauvegarde → *Choisir un fichier…* ou coller le JSON. Le fichier est vérifié (format, empreinte d'intégrité, version, types, bornes, identifiants, cohérence) avant de remplacer la partie, après confirmation.
- **Tout effacer** : Paramètres → Sauvegarde → *Réinitialiser complètement* (double confirmation).

Vider les données du site dans le navigateur efface aussi la partie : exportez-la régulièrement.

## Structure technique

```
token-overload/
├── index.html            page unique, CSP en <meta>, aucun script ni style inline
├── favicon.svg
├── README.md · SECURITY.md · PRIVACY.md
├── package.json          scripts de test (aucune dépendance)
├── tests/                tests node:test + simulateur d’équilibrage
├── .github/workflows/    tests puis déploiement GitHub Pages
├── assets/fonts/         Manrope + JetBrains Mono (woff2 locaux, licences OFL)
├── css/
│   ├── main.css          variables, polices, mise en page
│   ├── components.css    composants
│   ├── animations.css    animations (transform/opacity uniquement) + mode réduit
│   └── responsive.css    tablette et smartphone
└── js/
    ├── main.js           démarrage, boucle temps réel, sauvegardes
    ├── core/             logique pure, sans DOM (testée sous Node)
    │   ├── config.js        constantes d'équilibrage
    │   ├── numbers.js       arithmétique bornée, formatage
    │   ├── state.js         état initial, remise à zéro de partie
    │   ├── economy.js       coûts, production, multiplicateurs
    │   ├── engine.js        moteur : clics, achats, temps, événements, progression
    │   ├── events.js        tirage et application des événements
    │   ├── progression.js   grades
    │   ├── prestige.js      renaissance
    │   ├── achievements.js  détection des succès
    │   ├── statistics.js    historique et tableau de statistiques
    │   ├── storage.js       sauvegarde, validation, migrations, export/import
    │   └── settings.js      paramètres et validation
    ├── data/             contenu du jeu
    │   ├── upgrades.js      infrastructures, améliorations de clic, auto-cliqueurs
    │   ├── levels.js        grades
    │   ├── achievements.js  succès
    │   ├── events.js        événements aléatoires
    │   └── icons.js         icônes SVG originales
    └── ui/               interface (DOM via textContent uniquement)
        ├── ui.js            orchestration, onglets, notifications, cadence de rendu
        ├── hud.js · shop.js · panels.js · dialogs.js
        ├── effects.js       particules (canvas) et gains flottants
        ├── audio.js         sons synthétisés (Web Audio, aucun fichier)
        ├── charts.js · toast.js · tutorial.js · dom.js
```

### Boucle de jeu

`engine.advance(dt)` intègre la production sur le temps réel écoulé (`Date.now()`), en découpant aux échéances des effets temporaires : avancer de 16 ms ou de 8 heures donne le même résultat. `requestAnimationFrame` pilote l'affichage ; un minuteur d'une seconde prend le relais quand l'onglet est en arrière-plan. Au-delà de 5 minutes d'écart (veille, onglet gelé) ou à la réouverture, les règles hors ligne s'appliquent : 50 % d'efficacité, 24 h maximum, sans clics ni événements.

### Chaîne de multiplicateurs

```
brut    = Σ production_de_base × quantité × paliers
global  = 4^renaissances × (1 + bonus de succès) × (1 + 0,1 × grade)
TPS     = brut × global × événements(production)
clic    = (base de clic + part × brut) × global × événements(clic)
```

Chaque multiplicateur est appliqué exactement une fois ; les tests le vérifient.

### Grands nombres

Le jeu utilise des flottants double précision (jusqu'à ~1,8e308), largement suffisants pour la progression (≈ 1e40 après 30 renaissances). Toutes les écritures passent par une arithmétique saturante : aucune valeur ne peut devenir `NaN`, négative ou `Infinity`, même avec une sauvegarde hostile.

### Équilibrage

Les simulations (`npm run simulate` : un joueur glouton qui clique 4 fois par seconde) donnent environ 25 min pour la 1re renaissance, 40 min pour la 2e, puis des parties qui raccourcissent (5–7 min) avant de rallonger doucement (10–15 min vers la 30e). Les grades ultimes restent un objectif long terme, portés par les clics cumulés.

Le seuil de renaissance part de 1 M de tokens générés. La croissance ×10 constante proposée au départ a été mesurée : avec le multiplicateur ×4, les parties tombaient à quelques secondes dès la 7e renaissance. Le seuil est donc multiplié par 1 600, puis 960, 576… jusqu'à un plancher de ×5. Tout est réglable dans `js/core/config.js` (`prestige.growthStart`, `growthDecay`, `growthMin`).

## Tests

```bash
npm test
```

Node.js 22 ou plus suffit : aucune dépendance à installer.

61 tests (`node:test`, sans dépendance) couvrent : achats et coûts, production et delta time, clics et limitation, auto-clics, hors ligne, multiplicateurs (appliqués une seule fois), renaissances (remis à zéro / conservé, ×4), grades (cumul, jamais de régression), succès, événements (tirage, durées, boucliers, plafonds), sauvegarde locale, export/import (empreinte, types, bornes, versions, pollution de prototype, injection de multiplicateurs), réinitialisation, formatage, et un test d'équilibrage.

## Crédits et licences

Code, textes, icônes et sons originaux. Polices Manrope et JetBrains Mono sous licence SIL Open Font License 1.1 (voir `assets/fonts/licenses/`).
