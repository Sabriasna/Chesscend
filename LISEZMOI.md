# Chesscend — application d'échecs (iPhone + Android)

Application en anglais, pensée pour les **adultes débutants** : belle, bienveillante, et qui aide à progresser.

## Ce qui fonctionne

- **Home** : partie rapide, Blitz / Rapid / Classical / Custom, reprise de la partie en cours, leçon suivante, puzzle du jour
- **Play** : contre l'ordinateur (4 niveaux) ou contre un ami sur le même téléphone, pendule au choix
- **Ranking** : tes propres statistiques (classement estimé contre l'ordinateur, victoires, historique des parties)
- **Learn** : 2 cours (15 leçons avec échiquiers interactifs) + 10 puzzles « mat en 1 »
- **Coach** : pendant la partie, quand l'aide est activée, il prévient si une pièce est en danger et donne des conseils
- Règles complètes, annulation, historique des coups, sauvegarde automatique, 6 thèmes d'échiquier, vibrations
- **Profil** (rond en haut à gauche) : prénom, thème d'échiquier, options

## Pas encore disponible (affiché « Soon »)

- Jeu en ligne, classement mondial, amis, communauté, tournois
- Analyse de partie, vidéos, cours Tactiques et Finales

## Tester l'appli (sans rien installer)

1. Va sur **snack.expo.dev**
2. Menu **⋮** à côté de « Project » → **Import git repository** → `https://github.com/Sabriasna/Chesscend`
3. Onglet **My Device** → scanne le QR code avec l'appli **Expo Go**

Si Snack affiche un avertissement de version avec un lien « Update to… », clique dessus.

## Où modifier quoi

| Je veux… | Fichier |
|---|---|
| Couleurs de l'appli (crème, or, noir) | `src/theme/ui.js` |
| Thèmes d'échiquier | `src/theme/themes.js` |
| Leçons | `src/data/lessons.js` |
| Puzzles | `src/data/puzzles.js` |
| Force de l'ordinateur | `src/engine/ai.js` → `AI_LEVELS` |

## Le site web (dossier `web/`)

Une version site de Chesscend, responsive (ordinateur, tablette, téléphone), avec le même design et les mêmes onglets que l'appli. Le site et l'appli partagent le même moteur d'échecs, les mêmes leçons et les mêmes puzzles (`src/engine`, `src/data`) : une leçon modifiée change dans les deux.

**Mettre le site en ligne gratuitement (GitHub Pages) :**
1. Sur GitHub, ouvre le dépôt Chesscend → **Settings** → **Pages**.
2. Dans « Branch », choisis **main** et le dossier **/ (root)**, puis **Save**.
3. Après 1 à 2 minutes, le site est à l'adresse : `https://sabriasna.github.io/Chesscend/web/`

| Je veux changer sur le site… | Fichier |
|---|---|
| Couleurs, tailles, mise en page | `web/css/style.css` (en haut : les couleurs) |
| Textes des onglets | `web/js/pages.js` |
| Page de partie | `web/js/game.js` |
| Pages leçon et puzzle | `web/js/boards.js` |

La progression (classement, leçons, puzzles, partie en cours) est enregistrée dans le navigateur de chaque visiteur.

### Règles des parties (site)

- **Pendule :** en partie amicale ou contre l'ordinateur, elle se met en pause quand la page est cachée ou fermée, puis reprend au même temps.
- **Annuler un coup :** possible pendant la partie, avec le temps rendu. Contre l'ordinateur, la partie devient alors « unrated » et ne change pas le Computer Rating. Impossible une fois la partie terminée.
- **Temps écoulé :** la partie est perdue, sauf si l'adversaire n'a plus que son roi (nulle, règle officielle).
- **Nulles automatiques :** pat, triple répétition, 50 coups sans prise ni coup de pion, matériel insuffisant.
- **Computer Rating** (contre l'ordinateur, enregistré dans le navigateur) et **Online Rating** (futur jeu en ligne) sont séparés.

### Classement en ligne

Le classement mondial et le classement entre amis ont besoin d'un serveur, qui n'existe pas encore. Voir `docs/BACKEND.md`.

### Tests

- Moteur, sauvegardes, classements : `node --test tests/*.test.mjs`
- Site dans un vrai navigateur (Chrome et Python Playwright nécessaires) : `python3 tests/browser/e2e.py`
