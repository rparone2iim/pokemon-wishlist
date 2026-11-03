import { Hono } from 'hono'

export interface HealthResponse {
  status: 'ok'
  service: 'pokewishlist-api'
}

/** L'API Hono (sans base de données). Exportée seule pour être testée sans serveur. */
export const app = new Hono()

app.get('/health', (c) =>
  c.json<HealthResponse>({ status: 'ok', service: 'pokewishlist-api' }, 200),
)

app.notFound((c) => c.json({ error: 'Route introuvable' }, 404))
