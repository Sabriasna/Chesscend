# Chesscend — application mobile d'échecs (étape 1 : jeu hors ligne)

Application d'échecs pour iPhone et Android, réalisée avec **Expo** (React Native).

## Ce qui est inclus

- Règles complètes : roque, prise en passant, promotion (au choix), échec et mat, pat, triple répétition, règle des 50 coups, matériel insuffisant
- **Contre l'ordinateur** : 4 niveaux (Débutant, Facile, Moyen, Difficile), avec les Blancs, les Noirs ou au hasard
- **Deux joueurs** sur le même téléphone (option pour retourner l'échiquier à chaque tour)
- **Pendule** : sans, 3+2, 5 min, 10 min, 15+10, 30 min
- **Historique** des coups et bouton **Annuler**
- **Aide aux coups** activable/désactivable (bouton 💡 pendant la partie ou dans Réglages) : coups possibles + pièces en prise
- **Sauvegarde automatique** : fermez l'appli, reprenez plus tard depuis l'accueil
- **5 thèmes** : Bois classique (par défaut), Marbre, Tournoi, Océan, Nuit
- Pièces capturées, avantage matériel, vibrations à chaque coup

---

## Installer et lancer (pas à pas, débutant)

### 1. Installer les outils sur votre ordinateur (une seule fois)

1. Installez **Node.js** (version « LTS ») depuis https://nodejs.org — suivez l'installateur.
2. Installez **Visual Studio Code** (éditeur de code gratuit) depuis https://code.visualstudio.com
3. Sur votre téléphone, installez l'appli gratuite **Expo Go** (App Store ou Google Play).

### 2. Créer le projet

Ouvrez un **terminal** (Mac : application « Terminal » ; Windows : « Invite de commandes » ou « PowerShell »), puis tapez ces commandes une par une (Entrée après chacune) :

```bash
npx create-expo-app@latest echecs --template blank-typescript
cd echecs
npx expo install @react-native-async-storage/async-storage expo-haptics react-native-safe-area-context
```

> Si on vous demande « Ok to proceed? (y) », tapez `y` puis Entrée.

### 3. Copier les fichiers de l'appli

Dans le dossier `echecs` qui vient d'être créé :

1. **Remplacez** le fichier `App.tsx` par celui fourni.
2. **Copiez** le dossier `src` fourni (avec tout son contenu) à côté de `App.tsx`.

Vous devez obtenir :

```
echecs/
├── App.tsx
├── app.json
├── package.json
└── src/
    ├── components/   (Board, Piece, Modals, ui)
    ├── context/      (SettingsContext)
    ├── engine/       (chess = règles, ai = ordinateur)
    ├── screens/      (Home, Game, Settings)
    ├── storage/      (sauvegarde)
    └── theme/        (thèmes)
```

### 4. Personnaliser le nom (facultatif mais conseillé)

Ouvrez `app.json` dans VS Code et modifiez :

```json
"name": "Échecs",
"userInterfaceStyle": "dark",
```

et dans la partie `"splash"`, mettez `"backgroundColor": "#24170E"`.

### 5. Lancer sur votre téléphone

```bash
npx expo start
```

Un **QR code** s'affiche dans le terminal :

- **iPhone** : scannez-le avec l'appareil photo → l'appli s'ouvre dans Expo Go
- **Android** : ouvrez Expo Go → « Scan QR code »

Le téléphone et l'ordinateur doivent être sur **le même Wi-Fi**. Sinon, lancez `npx expo start --tunnel`.

Chaque fois que vous modifiez un fichier et l'enregistrez, l'appli se met à jour toute seule sur le téléphone.

---

## Modifier l'appli soi-même

| Je veux… | Fichier à ouvrir |
|---|---|
| Changer les couleurs d'un thème ou en ajouter un | `src/theme/themes.ts` (copiez un bloc `{ id: ..., }` et changez les couleurs) |
| Rendre l'ordinateur plus fort / plus faible | `src/engine/ai.ts` → tableau `AI_LEVELS` (`timeMs` = temps de réflexion, `noise` = erreurs volontaires) |
| Ajouter une cadence de pendule | `src/screens/HomeScreen.tsx` → `TIME_CONTROLS` |
| Changer les textes de l'accueil | `src/screens/HomeScreen.tsx` |

## En cas de problème

- **Écran rouge d'erreur** : lisez la première ligne, elle indique le fichier et la ligne. Copiez-la et envoyez-la-moi.
- **« Unable to resolve module »** : une installation a été oubliée → relancez la commande `npx expo install ...` de l'étape 2.
- **Le QR code ne marche pas** : `npx expo start --tunnel`.

## Suite du projet

- **Étape 2 — Jeu en ligne** : parties par code d'invitation + adversaire au hasard, avec Firebase (gratuit). Il faudra créer un compte Firebase.
- **Étape 3 — Publication** : comptes développeur Apple (99 $/an) et Google Play (25 $ une fois), icône, captures d'écran, puis envoi avec `eas build` et `eas submit`.
