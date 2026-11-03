# Preuves du TP CI · PokéWishlist

Dépôt : https://github.com/rparone2iim/pokemon-wishlist

Chaque étape a son commit (ou sa PR) sur `main`. Les étapes qui demandent une CI « rouge puis vert » passent par une PR : un commit casse volontairement la vérification, le suivant la corrige.

## Étape 1 · Setup

Projet Nuxt, dépôt GitHub et `.github/workflows/ci.yml`. Au premier push, le workflow apparaît dans l'onglet Actions.
Pipeline : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41602478072

![Workflow dans Actions](preuves/01-setup-actions.png)

## Étape 2 · App

Recherche via PokéAPI, ajout et suppression, sauvegarde dans le `localStorage`. Pikachu est ajouté, la page est rechargée : il est toujours dans la wishlist (vérifié dans Chromium et WebKit).

![Wishlist après rechargement](preuves/02-app-apres-rechargement.png)

## Étape 3 · Lint

`@nuxt/eslint`, avec `no-console` et `no-debugger` en erreur. Un `console.log` est poussé : **Lint (ESLint)** rouge ; il est retiré : vert.
PR : https://github.com/rparone2iim/pokemon-wishlist/pull/1

![PR lint rouge puis verte](preuves/03-lint-pr.png)

## Étape 4 · Format

Prettier (`singleQuote: true`, `semi: false`). Guillemets doubles et point-virgule poussés : `prettier --check` échoue, **Format (Prettier)** rouge ; après `npm run format` : vert.
PR : https://github.com/rparone2iim/pokemon-wishlist/pull/2

![PR format rouge puis verte](preuves/04-format-pr.png)

## Étape 5 · Types

Interfaces `Pokemon` et `WishlistItem` (`app/types/pokemon.ts`), fonctions et props typées. Un nombre rangé dans une variable `string` : `nuxt typecheck` échoue, **Typecheck (TypeScript)** rouge ; corrigé : vert.
PR : https://github.com/rparone2iim/pokemon-wishlist/pull/3

![PR types rouge puis verte](preuves/05-types-pr.png)

## Étape 6 · Unitaires

Tests Vitest de `addPokemon` : ajout, doublon, liste pleine (`test/wishlist.test.ts`). La règle est cassée (`>` au lieu de `>=`, un 7e Pokémon passe) : `vitest run` rouge ; rétablie : vert.
PR : https://github.com/rparone2iim/pokemon-wishlist/pull/4

![PR tests rouge puis verte](preuves/06-tests-pr.png)

## Étape 7 · API

`fetch` est mocké dans `test/pokeapi.test.ts` : réponse 200, Pokémon introuvable (404), PokéAPI en panne (500). `test/setup.ts` fait échouer tout appel réseau non mocké.

Les tests passent même sans connexion : lancés dans un bac à sable macOS qui coupe tout le réseau, où un vrai `fetch` vers PokéAPI échoue en `EPERM`.

```text
$ sandbox-exec -p '(version 1)(allow default)(deny network-outbound (remote ip))' npx vitest run
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

## Étape 8 · Stockage

Tests de la sauvegarde, de la lecture, du stockage vide, du JSON invalide, des entrées abîmées et d'un stockage plein ou inaccessible (`test/storage.test.ts`).

Écrits d'abord contre la première version du stockage (un simple `JSON.parse`), 6 tests sur 8 échouaient, et un JSON corrompu dans le `localStorage` faisait planter l'application :

![JSON corrompu : l'application plante](preuves/08-json-corrompu-avant.png)

Avec la lecture robuste (`app/utils/storage.ts`), les tests passent et le même JSON corrompu donne simplement une wishlist vide :

![JSON corrompu : l'application tient](preuves/08-json-corrompu-apres.png)

## Étape 9 · Build

`npm run build` dans la pipeline, après les contrôles. La page wishlist importe une feuille de style inexistante : le typecheck ne le voit pas, mais **Build (Nuxt)** est rouge ; l'import est retiré : vert.
PR : https://github.com/rparone2iim/pokemon-wishlist/pull/5

![PR build rouge puis verte](preuves/09-build-pr.png)

## Étape 10 · Actions

Un job par contrôle (lint, Prettier, typecheck, Vitest), puis le build. Chaque job fait `npm ci` via l'action commune `.github/actions/setup`.
Pipeline : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41605700746

![Pipeline complète](preuves/10-pipeline.png)

## Étape 11 · Validation

PR : https://github.com/rparone2iim/pokemon-wishlist/pull/6

1. Un `debugger` est laissé dans `addPokemon` : **Lint (ESLint)** échoue et le **Build** n'est pas lancé.
   Pipeline rouge : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41605903066

   ![CI rouge](preuves/11-ci-rouge.png)

2. Le `debugger` est retiré et la branche est repoussée : les 5 contrôles passent au vert.
   Pipeline verte : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41606045366

   ![CI verte](preuves/11-ci-verte.png)

3. Sur la PR, le premier commit est rouge (✗) et le second vert (✓).

   ![PR rouge puis verte](preuves/11-pr.png)

## Back · Setup · API Hono sans base de données

Monorepo npm workspaces : le front Nuxt passe dans `apps/web`, l'API Hono + TypeScript est dans `apps/api`. Dans la CI, le job **api · Build** compile l'API, la démarre et vérifie que `GET /health` renvoie 200.
Pipeline : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41606840672

```text
$ curl -i http://localhost:3001/health
HTTP/1.1 200 OK
{"status":"ok","service":"pokewishlist-api"}
```

![Push visible dans Actions, api · Build vert](preuves/b1-health-ci.png)

## Back · Routes · GET, POST et DELETE /wishlist

La wishlist est un tableau en mémoire (`apps/api/src/store.ts`). Les routes sont testées avec `app.request()`, sans démarrer de serveur (`apps/api/test/wishlist.test.ts`) :

```text
 ✓ test/health.test.ts > GET /health > renvoie 200 avec le statut ok
 ✓ test/health.test.ts > route inconnue > renvoie 404 en JSON
 ✓ test/wishlist.test.ts > GET /wishlist > renvoie 200 et une liste vide au départ
 ✓ test/wishlist.test.ts > GET /wishlist > renvoie 200 et les Pokémon ajoutés
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 201 et le Pokémon ajouté
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 409 pour un doublon
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 409 au-delà de 6 Pokémon
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 400 si le corps est invalide (JSON invalide)
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 400 si le corps est invalide (nom manquant)
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 400 si le corps est invalide (id pas un nombre)
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 400 si le corps est invalide (id négatif)
 ✓ test/wishlist.test.ts > POST /wishlist > renvoie 400 si le corps est invalide (nom vide)
 ✓ test/wishlist.test.ts > DELETE /wishlist/:id > renvoie 200 et retire le Pokémon
 ✓ test/wishlist.test.ts > DELETE /wishlist/:id > renvoie 404 si le Pokémon n’est pas dans la wishlist
 ✓ test/wishlist.test.ts > DELETE /wishlist/:id > renvoie 400 si l’identifiant est invalide
 ✓ test/wishlist.test.ts > mémoire > chaque app a sa propre wishlist
      Tests  16 passed (16)
```

## Back · CI · un `console.log` poussé dans l'API, rouge puis vert

PR : https://github.com/rparone2iim/pokemon-wishlist/pull/7

L'API a ESLint, Prettier, Vitest et ses scripts npm (`lint`, `format:check`, `typecheck`, `test`, `build`), lancés par `ci.yml`.

1. Un `console.log` est poussé dans l'API : **api · Lint (ESLint)** échoue (`no-console`) et les builds ne sont pas lancés.
   Pipeline rouge : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41607395049

   ![Back CI rouge](preuves/b3-ci-rouge.png)

2. Le `console.log` est retiré : les 9 contrôles passent au vert.
   Pipeline verte : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41607584594

   ![Back CI verte](preuves/b3-ci-verte.png)

3. Sur la PR, le commit cassé est rouge (✗) et le suivant vert (✓).

   ![Back PR rouge puis verte](preuves/b3-pr.png)

## Global · Connexion · Nuxt branché sur l'API Hono

Le front ne garde plus la wishlist lui-même : il appelle l'API Hono (`apps/web/app/utils/api.ts`).

| Action dans Nuxt      | Appel vers Hono                                                |
| --------------------- | -------------------------------------------------------------- |
| Ouvrir la wishlist    | `GET /wishlist`                                                |
| Ajouter un Pokémon    | `POST /wishlist`                                               |
| Retirer un Pokémon    | `DELETE /wishlist/:id`                                         |
| Renommer · Tout vider | `PATCH /wishlist/:id` · `DELETE /wishlist`                     |
| Chercher un Pokémon   | `GET /pokemon` · `GET /pokemon/:nom` (l'API interroge PokéAPI) |

Le `localStorage` n'est plus qu'un cache d'affichage (dernière liste connue si l'API ne répond pas) : la wishlist est celle de l'API.

Vérification (Chromium et WebKit) : wishlist de l'API vide, cache local vidé, puis Pikachu ajouté depuis Nuxt. Le front a appelé `GET /wishlist`, `GET /pokemon` puis `POST /wishlist`, et Pikachu apparaît dans `GET /wishlist` de l'API.

![Pikachu ajouté depuis Nuxt](preuves/g1-ajout-depuis-nuxt.png)

![GET /wishlist sur l'API](preuves/g1-get-wishlist-api.png)

## Global · E2E · un parcours réel avec Playwright

`npm run test:e2e` démarre tout seul les serveurs (`apps/web/playwright.config.ts`) : une fausse PokéAPI, **l'API Hono (back)** et **le front Nuxt**, puis clique dans de vrais navigateurs (Chromium et WebKit).

Le parcours réel (`apps/web/e2e/parcours.spec.ts`), entièrement fait dans l'interface, vérifie aussi l'API à chaque étape :

1. **Ajout** : Pikachu est ajouté depuis la recherche et apparaît dans l'API.
2. **Doublon** : Pikachu ne peut pas être ajouté une 2e fois. Et si un autre client l'ajoute entre-temps, l'API répond `409` et le front l'affiche une seule fois.
3. **Limite de 6** : après 6 Pokémon, le 7e est refusé (« Liste pleine »), l'API en a toujours 6.
4. **Suppression** : Pikachu est retiré, une place se libère et le 7e peut être ajouté.

Un test vérifie aussi que le cache `localStorage` continue d'être sauvegardé quand on arrive sur la wishlist depuis l'accueil. Sans le correctif de `useWishlist`, ce test échoue dans les deux navigateurs.

Résultat : 36 tests sur 36 (18 scénarios × 2 navigateurs).

![Rapport Playwright](preuves/g2-e2e-playwright.png)

## Global · CI · les tests E2E dans GitHub Actions

Le job **web · Tests E2E (Playwright)** de `ci.yml` construit Hono et Nuxt, **les démarre** (avec une fausse PokéAPI), vérifie qu'ils répondent, puis lance Playwright sur ces serveurs. Il tourne en parallèle des autres contrôles.

PR : https://github.com/rparone2iim/pokemon-wishlist/pull/10

1. Réponse API cassée : `POST /wishlist` renvoie `200` au lieu de `201`. Les trois serveurs démarrent bien, mais le front ne reconnaît plus la réponse et l'ajout échoue : **E2E rouge**, 12 tests en échec sur 36 (tous ceux qui ajoutent un Pokémon). Les tests unitaires de l'API échouent aussi.
   Pipeline rouge : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41609376335

   ![E2E rouge](preuves/g3-e2e-ci-rouge.png)

2. Réponse corrigée (`201`) : **E2E vert**, 36 tests sur 36, toute la pipeline est verte.
   Pipeline verte : https://github.com/rparone2iim/pokemon-wishlist/actions/runs/41610121015

   ![E2E vert](preuves/g3-e2e-ci-verte.png)

3. Sur la PR, le commit cassé est rouge (✗) et le suivant vert (✓).

   ![PR E2E rouge puis verte](preuves/g3-e2e-pr.png)
