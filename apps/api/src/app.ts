import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { PokeApi } from './pokeapi.js'
import { createPokeApi } from './pokeapi.js'
import { pokemonRoutes } from './routes/pokemon.js'
import { wishlistRoutes } from './routes/wishlist.js'
import type { WishlistStore } from './store.js'
import { createWishlistStore } from './store.js'

export interface HealthResponse {
  status: 'ok'
  service: 'pokewishlist-api'
}

export interface AppOptions {
  /** Wishlist en mémoire (une neuve par défaut). */
  store?: WishlistStore
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
 * Crée l'API Hono (sans base de données). Chaque appel a sa propre wishlist
 * en mémoire, ce qui isole les tests les uns des autres.
 */
export function createApp({
  store = createWishlistStore(),
  corsOrigins = corsOriginsFromEnv(),
  pokeApi = createPokeApi(),
}: AppOptions = {}) {
  const app = new Hono()

  app.use('*', cors({ origin: corsOrigins }))

  app.get('/health', (c) =>
    c.json<HealthResponse>({ status: 'ok', service: 'pokewishlist-api' }, 200),
  )

  app.route('/pokemon', pokemonRoutes(pokeApi))
  app.route('/wishlist', wishlistRoutes(store))

  app.notFound((c) => c.json({ error: 'Route introuvable' }, 404))

  return app
}

export const app = createApp()
