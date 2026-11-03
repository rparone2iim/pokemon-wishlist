# PokéWishlist

Une liste de Pokémon à capturer (6 maximum, comme une équipe), avec une CI GitHub Actions à chaque push.

Monorepo npm workspaces :

| Dossier    | App                       | Port |
| ---------- | ------------------------- | ---- |
| `apps/web` | Front Nuxt (style 8 bits) | 3000 |
| `apps/api` | API Hono + TypeScript     | 3001 |

## Lancer le projet

```bash
npm install
npm run dev       # front Nuxt sur http://localhost:3000
npm run dev:api   # API Hono sur http://localhost:3001
```

## API Hono

Sans base de données : la wishlist est un tableau en mémoire (6 Pokémon maximum).

| Route                  | Réponse                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `GET /health`          | `200` `{ "status": "ok", "service": "pokewishlist-api" }`                |
| `GET /wishlist`        | `200` et la liste                                                        |
| `POST /wishlist`       | `201` et le Pokémon ajouté · `400` corps invalide · `409` doublon/pleine |
| `DELETE /wishlist/:id` | `200` et le Pokémon retiré · `404` s'il n'y est pas                      |

Corps de `POST /wishlist` : `{ "id": 25, "name": "pikachu" }`. Les routes sont testées avec `app.request()` (`apps/api/test`), sans démarrer de serveur.

## Vérifications

Depuis la racine, chaque commande tourne dans les deux apps :

```bash
npm run lint           # ESLint (console.log et debugger interdits)
npm run format:check   # Prettier (guillemets simples, sans point-virgule)
npm run typecheck      # TypeScript
npm test               # Vitest
npm run build          # builds de production
```

## CI (GitHub Actions)

`.github/workflows/ci.yml` tourne à chaque push et sur chaque PR. Chaque contrôle est un job séparé, visible dans l'onglet Actions :

| Job                          | Commande                              |
| ---------------------------- | ------------------------------------- |
| Format (Prettier)            | `npm run format:check`                |
| web · Lint (ESLint)          | `npm run lint -w apps/web`            |
| web · Typecheck (TypeScript) | `npm run typecheck -w apps/web`       |
| web · Tests (Vitest)         | `npm test -w apps/web`                |
| api · Typecheck (TypeScript) | `npm run typecheck -w apps/api`       |
| web · Build                  | `npm run build -w apps/web`           |
| api · Build                  | build, puis `GET /health` renvoie 200 |

Chaque job installe Node.js 24 et les dépendances avec `npm ci` (action commune `.github/actions/setup`). Les builds ne se lancent que si tous les contrôles sont verts.
