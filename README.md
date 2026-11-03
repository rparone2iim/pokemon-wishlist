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

## Scripts (à la racine)

| Commande               | Rôle                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Front Nuxt en dev                                                |
| `npm run dev:api`      | API Hono en dev                                                  |
| `npm run lint`         | ESLint sur les deux apps (`console.log` et `debugger` interdits) |
| `npm run typecheck`    | Vérification TypeScript des deux apps                            |
| `npm test`             | Tests Vitest des deux apps                                       |
| `npm run test:e2e`     | Tests end-to-end Playwright (démarre front et back)              |
| `npm run build`        | Build des deux apps                                              |
| `npm run format`       | Formate tout le dépôt (Prettier)                                 |
| `npm run format:check` | Vérifie le format                                                |

Pour une seule app : `npm run test -w apps/api`, `npm run build -w apps/web`, etc.

## CI (GitHub Actions)

`.github/workflows/ci.yml`, à chaque push et sur chaque PR :

1. `npm ci` à la racine dans chaque job (action commune `.github/actions/setup`)
2. Prettier sur tout le dépôt
3. Lint, typecheck et tests Vitest pour **web** et **api**, en parallèle ; les tests de l'API tournent sur un conteneur PostgreSQL
4. Build des deux apps si tout est vert, puis l'API est lancée et `GET /health` doit renvoyer `200`
5. En parallèle, tests end-to-end : la CI construit et **démarre Hono et Nuxt** (et une fausse PokéAPI), vérifie qu'ils répondent, puis lance Playwright (Chromium et WebKit)

Les preuves du TP (liens et captures de la CI rouge puis verte) sont dans [PREUVES.md](PREUVES.md).
