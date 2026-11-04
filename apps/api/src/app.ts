import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './i18n.js'
import { detectLanguage, t } from './i18n.js'
import type { PokeApi } from './pokeapi.js'
import { createPokeApi } from './pokeapi.js'
import { pokemonRoutes } from './routes/pokemon.js'
import { wishlistRoutes } from './routes/wishlist.js'
import type { WishlistStore } from './store.js'

export interface HealthResponse {
  status: 'ok'
  service: 'pokewishlist-api'
  /** Commit déployé (7 caractères), « dev » en local. */
  version: string
}

/** Version de l'API : APP_VERSION, figée au build du paquet Lambda par la CD. */
export const appVersion = () => process.env.APP_VERSION ?? 'dev'

export interface AppOptions {
  /** Où la wishlist est gardée (PostgreSQL). */
  store: WishlistStore
  /** Origines autorisées à appeler l'API depuis un navigateur (le front). */
  corsOrigins?: string[]
  /** Client PokéAPI (adresse dans POKEAPI_URL, la vraie PokéAPI par défaut). */
  pokeApi?: PokeApi
}

/** Origines autorisées, lues dans CORS_ORIGIN (séparées par des virgules). */
export function corsOriginsFromEnv(value = process.env.CORS_ORIGIN): string[] {
  return (value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/**
 * Crée l'API Hono. La wishlist est dans PostgreSQL : index.ts lui donne la
 * base de DATABASE_URL, les tests une base de test isolée.
 */
export function createApp({
  store,
  corsOrigins = corsOriginsFromEnv(),
  pokeApi = createPokeApi(),
}: AppOptions) {
  const app = new Hono<AppEnv>()

  app.use('*', cors({ origin: corsOrigins }))
  // Langue des messages d'erreur : ?lang= ou Accept-Language (anglais par défaut)
  app.use('*', detectLanguage)

  app.get('/health', (c) =>
    c.json<HealthResponse>(
      { status: 'ok', service: 'pokewishlist-api', version: appVersion() },
      200,
    ),
  )

  app.route('/pokemon', pokemonRoutes(pokeApi))
  app.route('/wishlist', wishlistRoutes(store))

  app.notFound((c) => c.json({ error: t(c, 'routeNotFound') }, 404))

  return app
}
