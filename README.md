# PokéWishlist

Une application Nuxt pour noter les Pokémon que l'on veut capturer, avec une CI GitHub Actions à chaque push.

## Lancer le projet

```bash
npm install
npm run dev
```

L'application tourne sur http://localhost:3000.

## Vérifications

```bash
npm run lint           # ESLint (console.log et debugger interdits)
npm run format:check   # Prettier (guillemets simples, sans point-virgule)
npm run typecheck      # nuxt typecheck (types Pokemon et WishlistItem)
npm test               # Vitest (règle des 6 Pokémon, doublons...)
npm run build          # build de production Nuxt
```

## CI (GitHub Actions)

`.github/workflows/ci.yml` tourne à chaque push et sur chaque PR. Chaque contrôle est un job séparé, visible dans l'onglet Actions :

| Job                    | Commande               |
| ---------------------- | ---------------------- |
| Lint (ESLint)          | `npm run lint`         |
| Format (Prettier)      | `npm run format:check` |
| Typecheck (TypeScript) | `npm run typecheck`    |
| Tests (Vitest)         | `npm test`             |
| Build (Nuxt)           | `npm run build`        |

Chaque job installe Node.js 24 et les dépendances avec `npm ci` (action commune `.github/actions/setup`). Le build ne se lance que si les 4 contrôles sont verts.
