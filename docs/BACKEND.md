# Chesscend : ce qu'il faut pour un vrai classement en ligne

## 1. État actuel (vérifié dans le code, novembre 2026)

| Élément | Présent ? | Détail |
|---|---|---|
| Authentification (comptes) | Oui (nov. 2026) | Supabase Auth : e-mail + mot de passe, pseudo unique. |
| Base de données | Oui | Supabase (Irlande) : `profiles` et `user_data`, protégées par RLS (`supabase/schema.sql`). |
| Identifiants utilisateurs persistants | Oui | L'identifiant du compte relie les appareils d'un même joueur. |
| Backend / serveur | Non | GitHub Pages ne sert que des fichiers statiques. |
| Multijoueur en ligne | Non | Seulement « contre l'ordinateur » et « à deux sur le même appareil ». |
| Validation des résultats | Non | Un résultat enregistré dans le navigateur peut être modifié par son utilisateur. |

Conséquence : **un classement mondial ou entre amis ne peut pas fonctionner aujourd'hui**. Les onglets Global et Friends sont ouverts et affichent clairement cet état. Aucun joueur ni score n'est inventé.

Ce qui fonctionne déjà : le **Computer Rating** (progression contre l'ordinateur), local à chaque navigateur. Il est volontairement séparé du futur **Online Rating**.

## 2. Architecture proposée

GitHub Pages peut rester l'hébergement du site. Il faut y ajouter un service en ligne. Supabase est un bon choix pour démarrer : il réunit comptes, base PostgreSQL, temps réel et fonctions serveur, avec une offre gratuite. Firebase ou un petit serveur Node avec PostgreSQL conviendraient aussi.

```
Navigateur (GitHub Pages)  ──►  Supabase Auth            comptes (e-mail, Google, Apple)
        │                  ──►  Realtime (WebSocket)     coups en direct, horloges
        │                  ──►  Edge Function "move"     vérifie chaque coup, gère le temps
        │                  ──►  Edge Function "finish"   calcule le résultat et le rating
        └── lecture seule  ──►  Postgres + RLS           profils, parties, classement
```

### Règle d'or : le serveur décide

- Le navigateur **envoie des coups**, jamais un résultat ni un score.
- La fonction serveur rejoue chaque coup avec le **même moteur** que le site (`src/engine/chess.js`, du JavaScript pur, exécutable tel quel côté serveur). Elle refuse tout coup illégal.
- L'**horloge est tenue par le serveur** : il note l'heure de chaque coup. Si un joueur quitte l'appli, son temps continue de s'écouler. À zéro, le serveur déclare la perte au temps (ou la nulle si l'adversaire n'a plus que son roi). Sans aucun coup pendant un délai fixé, la partie est perdue par abandon.
- Pas d'annulation de coup en partie classée.
- Le **rating est calculé uniquement par le serveur** (Elo ou Glicko-2), dans une transaction, une seule fois par partie.

### Tables (PostgreSQL)

| Table | Contenu | Qui peut écrire |
|---|---|---|
| `profiles` | id (= compte), pseudo unique, avatar, date d'inscription | le joueur (pseudo et avatar uniquement) |
| `games` | id, blanc, noir, cadence, statut, résultat, raison, dates | serveur uniquement |
| `moves` | partie, numéro, coup (SAN), temps restant, horodatage serveur | serveur uniquement |
| `ratings` | joueur, online_rating, parties classées, dernière partie | serveur uniquement |
| `friendships` | demandeur, destinataire, statut (en attente, accepté) | les deux joueurs concernés |

Les règles **RLS** (Row Level Security) interdisent toute écriture du navigateur dans `games`, `moves` et `ratings`. La clé publique Supabase (« anon key ») peut alors figurer dans le site sans risque : ce n'est pas un secret. En revanche, la clé `service_role` ne doit **jamais** être dans le code du site.

### Classement

- **Éligibilité :** au moins 5 parties classées en ligne (valeur de `MIN_RANKED_GAMES` dans `web/js/online.js`). Option : avoir joué dans les 90 derniers jours.
- **Vue `leaderboard` :** position, pseudo, avatar, online_rating, nombre de parties. Elle est recalculée après chaque partie terminée (trigger), donc toujours à jour.
- **Amis :** même vue, filtrée sur les amitiés acceptées.

## 3. Brancher le site

Tout est prêt côté interface, dans `web/js/online.js` :

1. Créer un objet `provider` avec trois méthodes : `getSession()`, `getGlobalLeaderboard()` et `getFriendsLeaderboard()`. Leur format est décrit en haut du fichier.
2. Remplacer `export const provider = null;` par cet objet.

Les écrans suivants sont déjà codés et testés (`tests/web.test.mjs`) :

| Situation | Écran affiché |
|---|---|
| Pas de service en ligne (aujourd'hui) | « The online leaderboard opens with ranked play » |
| Chargement | Lignes grisées animées |
| Erreur réseau | Message et bouton « Try again » |
| Non connecté (onglet amis) | « Sign in to see your friends » |
| A : aucun inscrit | « Be the first to reach the top. » + « Start Playing » |
| B : des inscrits, personne de classé | Nombre réel de membres + condition des 5 parties |
| C : joueurs classés | Podium des 3 premiers, liste, position de l'utilisateur mise en évidence |
| Amis : aucun ami | « Your next rival could be a friend. » + « Find Friends » (si la recherche existe) |

## 4. À faire avant d'ouvrir le jeu en ligne

1. Créer le projet Supabase (ou équivalent) et les tables ci-dessus, avec RLS activé.
2. Écrire les fonctions serveur `move` et `finish`, avec les tests de triche : coup illégal, résultat forcé, double envoi, horloge figée.
3. Ajouter l'inscription et la connexion sur le site (et dans l'appli mobile).
4. Mettre en place le jeu en ligne : invitation par code, puis appariement par niveau.
5. Gérer les comptes : pseudo modéré, suppression de compte, signalement.
6. Volet légal (RGPD) : politique de confidentialité, mentions légales, conditions d'utilisation, âge minimum. Ne collecter que le nécessaire.
7. Pour les forums et les clubs : modération avant ouverture.

## Connexion avec Google

Le site appelle `/auth/v1/authorize?provider=google` et revient sur `web/` avec la session dans l'adresse (#access_token=…).
Tant que le fournisseur Google n'est pas activé dans Supabase, le bouton affiche « pas encore disponible » (vérifié via `/auth/v1/settings`).

À faire une fois :
1. Google Cloud Console → APIs & Services → écran de consentement OAuth (type « Externe »), puis Identifiants → Créer → ID client OAuth → « Application Web ».
   - Origine JavaScript autorisée : `https://sabriasna.github.io`
   - URI de redirection autorisé : `https://umisavpcofubvegdmglc.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Sign In / Providers → Google : activer, coller l'ID client et le code secret, enregistrer.

Un compte créé avec Google reçoit le pseudo provisoire `player_xxxxxxxx` ; la page Compte demande au joueur d'en choisir un.

## Parties en ligne (activées le 24/11/2026)

- **Base** : `supabase/online.sql` (tables `online_games` et `ratings`, fonctions `finish_online_game`, `online_leaderboard`, `online_opponents`).
  Les navigateurs ne peuvent que LIRE leurs propres parties et leur propre classement (RLS).
- **Serveur** : Edge Function `online` (`supabase/functions/online/`), déployée avec `verify_jwt = false`
  (la session du joueur est vérifiée dans la fonction via `/auth/v1/user`).
  Elle rejoue et vérifie chaque coup avec le moteur (`src/online/core.js` + `src/engine/chess.js`, copiés dans le dossier de la fonction),
  tient les pendules, et écrit résultats + classement Elo (K = 40 pour les 20 premières parties, puis 20) en une seule transaction.
- **Règles** : pendules 3+2, 5, 10, 15+10, 30 min ; couleurs tirées au sort ; pendules lancées après le premier coup de chaque joueur ;
  60 s pour jouer son premier coup ; annulation possible avant que les deux aient joué (non classée) ; nulle proposée/acceptée ;
  une seule partie à la fois ; une partie abandonnée par les deux joueurs est clôturée au temps.
- **Classements** : mondial = joueurs avec au moins 5 parties classées ; « Amis » = joueurs affrontés en ligne.
- **Redéployer la fonction** : copier `src/online/core.js` → `supabase/functions/online/online/core.js` et `src/engine/chess.js` → `supabase/functions/online/engine/chess.js`, puis déployer `supabase/functions/online`.
- **Tests** : `tests/online.test.mjs` (règles), `tests/online-function.test.mjs` (la fonction), `tests/browser/e2e.py` → `test_online` (deux joueurs dans le navigateur, avec `tests/browser/online-server.mjs`).
