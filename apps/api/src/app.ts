import { Hono } from 'hono'
import { wishlistRoutes } from './routes/wishlist.js'
import type { WishlistStore } from './store.js'
import { createWishlistStore } from './store.js'

export interface HealthResponse {
  status: 'ok'
  service: 'pokewishlist-api'
}

/**
 * Crée l'API Hono (sans base de données). Chaque appel a sa propre wishlist
 * en mémoire, ce qui isole les tests les uns des autres.
 */
export function createApp(store: WishlistStore = createWishlistStore()) {
  const app = new Hono()

  app.get('/health', (c) =>
    c.json<HealthResponse>({ status: 'ok', service: 'pokewishlist-api' }, 200),
  )

  app.route('/wishlist', wishlistRoutes(store))

  app.notFound((c) => c.json({ error: 'Route introuvable' }, 404))

  return app
}

export const app = createApp()
