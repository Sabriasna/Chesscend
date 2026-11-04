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
