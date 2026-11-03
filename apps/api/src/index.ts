import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { createPool } from './db.js'
import { createPgWishlistStore } from './pg-store.js'

const port = Number(process.env.PORT ?? 3001)

// La wishlist est dans PostgreSQL (DATABASE_URL, voir .env.example)
const pool = createPool()
const app = createApp({ store: createPgWishlistStore(pool) })

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.info(`API Hono prête sur http://localhost:${info.port}`)
})

// Arrêt propre : on ferme le serveur puis les connexions à la base
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void pool.end().then(() => process.exit(0))
  })
}
