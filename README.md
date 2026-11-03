# PokéWishlist

Une liste de Pokémon à capturer (6 maximum, comme une équipe), avec une CI GitHub Actions à chaque push.

Monorepo npm workspaces :

```
apps/
  web/   Front Nuxt (style 8 bits), port 3000
  api/   API Hono + TypeScript + PostgreSQL (Supabase), port 3001
```

## Architecture

```
navigateur (front Nuxt) ──▶ API Hono ──▶ PokéAPI
                              └─ wishlist dans PostgreSQL (Supabase)
```

Le front ne parle qu'à l'API Hono. C'est l'API qui interroge PokéAPI et qui garde la wishlist.

## Lancer le projet

```bash
npm install
npm run dev       # front Nuxt sur http://localhost:3000
npm run dev:api   # API Hono sur http://localhost:3001
```

## Langues (i18n)

L'appli et l'API parlent **anglais par défaut**, et aussi français, espagnol et allemand.

- **Front** : `apps/web/i18n/locales/{en,fr,es,de}.json`. Le sélecteur EN · FR · ES · DE en haut à droite change toute l'interface ; la langue est gardée dans le navigateur. Les clés sont typées à partir de `en.json` (`app/utils/i18n.ts`).
- **Vérification** : `npm run i18n:check` compare chaque fichier de langue à `en.json` (clés manquantes ou en trop, traductions vides, paramètres `{…}`), côté front et côté back. La CI le lance à chaque push.
- **API** : `apps/api/src/locales/{en,fr,es,de}.json` pour les messages d'erreur. La langue vient de `?lang=` ou de l'en-tête `Accept-Language`, que le front envoie à chaque requête. La fiche Pokémon (nom, catégorie, description) arrive aussi dans cette langue.

## apps/web · le front Nuxt

- `/` : page d'accueil, un jardin en pixel art où des Pokémon se baladent
- `/wishlist` : la recherche et la wishlist (6 Pokémon max, renommables)
- `/pokemon/[name]` : la fiche d'un Pokémon (`/pokemon/pikachu`, `/pokemon/25`…) : nom français, types, description du Pokédex, taille, poids, talents et statistiques, ou « introuvable » (404). On l'ouvre en cliquant sur l'image d'une carte.
- Tous les appels passent par l'API Hono (`app/utils/api.ts`), adresse `http://localhost:3001` par défaut, modifiable avec `NUXT_PUBLIC_API_BASE`
- L'écran se met à jour tout de suite, puis revient en arrière si l'API refuse
- Le `localStorage` sert de cache : la dernière liste connue s'affiche tout de suite, même si l'API ne répond pas
- Tests Vitest : règles de la wishlist (`test/wishlist.test.ts`) et cache `localStorage` (`test/storage.test.ts`)
- **Tests end-to-end Playwright** (`e2e/`) sur Chromium et WebKit. Ils lancent une fausse PokéAPI (`e2e/mock-pokeapi.mjs`), la vraie API Hono et le vrai front, puis cliquent dans le navigateur :
  - parcours réel complet (`e2e/parcours.spec.ts`) : ajout, doublon (y compris refusé par l'API en `409`), limite de 6, suppression
  - accueil (jardin, Pokémon qui bougent, bouton Commencer)
  - recherche via l'API (aucun appel direct à PokéAPI), Pokémon introuvable (404)
  - fiche `/pokemon/[name]` : URL directe, nom français et types, numéro ou majuscules, 404, ouverture depuis une carte, ajout depuis la fiche
  - ajout, rechargement, renommage, retrait, limite de 6 Pokémon
  - API en panne, cache `localStorage` : sauvegarde, lecture, stockage vide, JSON corrompu

## apps/api · l'API Hono

- [Hono](https://hono.dev) + TypeScript, servie avec `@hono/node-server`
- Interroge PokéAPI (adresse dans `POKEAPI_URL`), la liste complète est gardée en mémoire après le 1er appel
- Wishlist stockée dans PostgreSQL (Supabase) avec des requêtes SQL paramétrées (`src/pg-store.ts`), 6 Pokémon max : elle survit aux redémarrages de l'API

| Route                   | Réponses                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`           | `200` `{ "status": "ok", "service": "pokewishlist-api" }`                                                                         |
| `GET /pokemon`          | `200` tous les Pokémon · `502` PokéAPI en panne                                                                                   |
| `GET /pokemon/:nomOuId` | `200` la fiche (nom français, types, taille, poids, talents, stats, description) · `404` introuvable · `400` nom invalide · `502` |
| `GET /wishlist`         | `200` la liste                                                                                                                    |
| `POST /wishlist`        | `201` le Pokémon ajouté · `400` corps invalide · `409` doublon ou pleine                                                          |
| `PATCH /wishlist/:id`   | `200` surnom changé · `404` absent · `400` corps invalide                                                                         |
| `DELETE /wishlist/:id`  | `200` le Pokémon retiré · `404` absent · `400` identifiant invalide                                                               |
| `DELETE /wishlist`      | `204` vide la wishlist                                                                                                            |

Corps de `POST /wishlist` : `{ "id": 25, "name": "pikachu" }` · de `PATCH` : `{ "nickname": "Sparky" }`

- CORS : le front peut appeler l'API (origines dans `CORS_ORIGIN`, `http://localhost:3000` par défaut)
- Tests Vitest, sans réseau (tout appel à `fetch` non mocké échoue) :
  - `test/wishlist.test.ts` : **tests d'intégration** des routes `/wishlist` avec `app.request()` sur une vraie base PostgreSQL de test, sans mock SQL : CRUD, doublons, limite de 6 (y compris 10 ajouts en même temps), persistance, CORS
  - `test/pokeapi.test.ts` : PokéAPI avec `fetch` mocké (200, 404, 500), fiche détaillée (espèce, cache) et routes `/pokemon`
  - `test/health.test.ts` : `GET /health`
- Base de test : `TEST_DATABASE_URL` (par défaut `postgresql://localhost:5432/pokewishlist_test`). Vitest la crée si besoin, y applique `db/init.sql`, la vide avant chaque test et à la fin. Les tests refusent de tourner sur une base dont le nom ne contient pas « test », et sur Supabase.

## Base de données (Supabase · PostgreSQL)

Le schéma est dans `apps/api/db/init.sql` : la table `wishlist` (clé primaire `pokemon_id` contre les doublons, trigger `wishlist_max_6` pour la règle des 6 Pokémon, RLS activé pour fermer l'API REST de Supabase). Le script peut être relancé sans risque.

```bash
cp apps/api/.env.example apps/api/.env   # puis y mettre la chaîne de connexion Supabase
npm run db:init -w apps/api               # applique db/init.sql sur DATABASE_URL
```

L'API lit `DATABASE_URL` dans `apps/api/.env` (`npm run dev:api`, `npm run start -w apps/api`). La connexion à Supabase est chiffrée et son certificat est vérifié avec le certificat racine de Supabase (`apps/api/db/supabase-root-2021-ca.crt`).

Les tests E2E n'utilisent jamais Supabase : en local, ils tournent sur une base PostgreSQL dédiée (`createdb pokewishlist_e2e`, ou une autre adresse dans `E2E_DATABASE_URL`) ; dans la CI, sur un conteneur PostgreSQL.

## En ligne

- **Front (Nuxt SSR, Vercel)** : https://pokewishlist-8bit.vercel.app
- **Front statique (SSG, S3 + CloudFront)** : https://d1kkqanpvbsbt6.cloudfront.net
- **API (Hono, AWS Lambda)** : https://ds5i6cov6l.execute-api.eu-west-3.amazonaws.com

## Déploiement Vercel (front, SSR)

- Le front est rendu côté serveur (`ssr: true`) : une fiche `/pokemon/pikachu` arrive déjà remplie, et un Pokémon inconnu renvoie un vrai 404.
- La langue est gardée dans un cookie, pour que le serveur rende la page dans la bonne langue. Côté serveur, rien n'est partagé entre visiteurs.
- Variable Vercel : `NUXT_PUBLIC_API_BASE` = l'URL de l'API AWS. La Lambda autorise le domaine Vercel (`LAMBDA_CORS_ORIGIN`).
- **CD** : le job **web · Déploiement Vercel (production)** de `ci.yml` ne tourne que sur `main`, une fois toute la CI verte. Il fait `vercel pull`, `vercel build` (preset Nitro `vercel`), `vercel deploy --prebuilt --prod`, puis vérifie que le site sert bien ce commit. La version déployée (commit) s'affiche en bas à droite et dans `<meta name="app-version">`.
- Secrets GitHub : `VERCEL_TOKEN` (secret) ; `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` (variables).

## Fiches prégénérées au build

`PRERENDER_POKEMON=151` : au build, les noms des 151 premiers Pokémon sont lus dans PokéAPI et leurs routes `/pokemon/<nom>` sont ajoutées à `nitro.prerender.routes` (`apps/web/prerender.ts`). Les autres fiches restent rendues à la demande. La limite garde le build rapide ; la prégénération va 3 pages à la fois, car l'API Lambda n'accepte que 10 exécutions simultanées.

## Front statique sur S3 + CloudFront (SSG)

`npm run deploy:ssg -w apps/web` (`apps/web/scripts/deploy-ssg.sh`, AWS CLI) : `nuxt generate` (151 fiches prégénérées), puis bucket S3 **privé** lisible seulement par CloudFront (OAC), fonction CloudFront qui sert `/pokemon/pikachu` depuis `pokemon/pikachu/index.html`, `200.html` pour les fiches non prégénérées, envoi des fichiers et invalidation du cache. Le site statique utilise la même API AWS que le front Vercel.

## Déploiement AWS (API)

L'API Hono tourne aussi sur **AWS Lambda** (Node 22, arm64, Paris), derrière une **API HTTP d'API Gateway** : https://ds5i6cov6l.execute-api.eu-west-3.amazonaws.com

- `src/lambda.ts` : le gestionnaire Lambda (`hono/aws-lambda`) ; même app, même base Supabase.
- `npm run build:lambda -w apps/api` : un seul fichier (esbuild) + le certificat de Supabase, dans `dist-lambda/`.
- `npm run deploy:lambda -w apps/api` : crée ou met à jour le rôle IAM, la fonction Lambda et l'API Gateway (AWS CLI, connecté avec `aws login`). Le script peut être relancé.
- Variables de la Lambda : `DATABASE_URL` (le pooler Supabase en mode transaction, port 6543, conseillé pour Lambda ; lu dans `LAMBDA_DATABASE_URL` de `apps/api/.env`) et `CORS_ORIGIN` (le front autorisé). Le CORS est géré par Hono.
- Pour brancher le front sur l'API AWS : `NUXT_PUBLIC_API_BASE=https://ds5i6cov6l.execute-api.eu-west-3.amazonaws.com`.

## Scripts (à la racine)

| Commande               | Rôle                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`          | Front Nuxt en dev                                                            |
| `npm run dev:api`      | API Hono en dev                                                              |
| `npm run lint`         | ESLint sur les deux apps (`console.log` et `debugger` interdits)             |
| `npm run typecheck`    | Vérification TypeScript des deux apps                                        |
| `npm test`             | Tests Vitest des deux apps                                                   |
| `npm run test:e2e`     | Tests end-to-end Playwright (démarre front et back)                          |
| `npm run build`        | Build des deux apps                                                          |
| `npm run format`       | Formate tout le dépôt (Prettier)                                             |
| `npm run format:check` | Vérifie le format                                                            |
| `npm run i18n:check`   | Vérifie que chaque fichier de langue a les clés de `en.json` (front et back) |

Pour une seule app : `npm run test -w apps/api`, `npm run build -w apps/web`, etc.

## CI (GitHub Actions)

`.github/workflows/ci.yml`, à chaque push et sur chaque PR :

1. `npm ci` à la racine dans chaque job (action commune `.github/actions/setup`)
2. Prettier sur tout le dépôt, et les traductions : `scripts/check-locales.mjs` compare chaque fichier de langue à `en.json` (front et back) ; une clé manquante fait échouer la CI
3. Lint, typecheck et tests Vitest pour **web** et **api**, en parallèle ; les tests de l'API tournent sur un conteneur PostgreSQL
4. Build des deux apps si tout est vert, puis l'API est lancée et `GET /health` doit renvoyer `200`
5. En parallèle, tests end-to-end : la CI construit et **démarre Hono et Nuxt** (et une fausse PokéAPI), vérifie qu'ils répondent, puis lance Playwright (Chromium et WebKit)

6. Sur `main` uniquement, si tout est vert : déploiement du front en production sur Vercel (SSR) et du site statique sur S3 + CloudFront (SSG), avec connexion à AWS par OIDC (aucune clé AWS dans GitHub)

Les preuves du TP (liens et captures de la CI rouge puis verte) sont dans [PREUVES.md](PREUVES.md).
