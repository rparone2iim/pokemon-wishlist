import { handle } from 'hono/aws-lambda'
import { createApp } from './app.js'
import { createPool } from './db.js'
import { createPgWishlistStore } from './pg-store.js'

// Point d'entrée AWS Lambda (derrière API Gateway). L'app et le pool sont créés
// une fois par conteneur, puis réutilisés d'un appel à l'autre.
// Variables : DATABASE_URL (Supabase), CORS_ORIGIN (le front), POKEAPI_URL.
const pool = createPool(process.env.DATABASE_URL, 2)
const app = createApp({ store: createPgWishlistStore(pool) })

export const handler = handle(app)
