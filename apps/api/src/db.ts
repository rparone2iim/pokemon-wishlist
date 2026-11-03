import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import pg from 'pg'

/**
 * Certificat racine de Supabase : la connexion à Supabase est chiffrée et
 * le certificat du serveur est vérifié (pas de `rejectUnauthorized: false`).
 */
const SUPABASE_CA = new URL('../db/supabase-root-2021-ca.crt', import.meta.url)

/** Configuration du pool à partir de DATABASE_URL (Supabase ou PostgreSQL local). */
export function poolConfig(databaseUrl: string): pg.PoolConfig {
  const url = new URL(databaseUrl)
  if (!url.hostname.endsWith('.supabase.com'))
    return { connectionString: databaseUrl }
  // Le SSL est réglé ici : un « sslmode » dans l'URL passerait par-dessus
  url.searchParams.delete('sslmode')
  return {
    connectionString: url.toString(),
    ssl: { ca: readFileSync(SUPABASE_CA, 'utf8') },
  }
}

/** Pool de connexions PostgreSQL (les connexions sont ouvertes à la demande). */
export function createPool(databaseUrl = process.env.DATABASE_URL): pg.Pool {
  if (!databaseUrl)
    throw new Error(
      'DATABASE_URL manquant : copier apps/api/.env.example en apps/api/.env',
    )
  const pool = new pg.Pool({ ...poolConfig(databaseUrl), max: 5 })
  // Une connexion inactive coupée par le serveur ne doit pas arrêter l'API
  pool.on('error', (error) => console.error('PostgreSQL :', error.message))
  return pool
}

/** Applique db/init.sql (le schéma) sur la base du pool. */
export async function applySchema(pool: pg.Pool): Promise<void> {
  const sql = await readFile(new URL('../db/init.sql', import.meta.url), 'utf8')
  await pool.query(sql)
}
