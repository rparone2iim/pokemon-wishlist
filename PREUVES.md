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
