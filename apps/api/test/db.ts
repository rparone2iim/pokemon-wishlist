import pg from 'pg'
import { applySchema, createPool } from '../src/db.js'

/**
 * Base PostgreSQL des tests : une base à part, vidée avant chaque test.
 * Jamais Supabase : son nom doit contenir « test » (voir assertTestDatabase).
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://localhost:5432/pokewishlist_test'

/** Refuse de lancer les tests ailleurs que sur une base de test. */
export function assertTestDatabase(url: string): void {
  const { hostname, pathname } = new URL(url)
  if (hostname.endsWith('.supabase.com') || !pathname.includes('test'))
    throw new Error(
      `Tests refusés sur ${hostname}${pathname} : il faut une base de test (nom contenant « test »)`,
    )
}

export function createTestPool(): pg.Pool {
  assertTestDatabase(TEST_DATABASE_URL)
  return createPool(TEST_DATABASE_URL)
}

/** Vide la wishlist : chaque test part d'une base propre. */
export async function resetDatabase(pool: pg.Pool): Promise<void> {
  await pool.query('truncate table wishlist')
}

/** Crée la base de test si elle n'existe pas encore (utile en local). */
async function createDatabaseIfMissing(url: string): Promise<void> {
  const name = decodeURIComponent(new URL(url).pathname.slice(1))
  const admin = new URL(url)
  admin.pathname = '/postgres'
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query(
      'select 1 from pg_database where datname = $1',
      [name],
    )
    // Un nom de base ne peut pas être un paramètre : il est échappé à la main
    if (!rowCount)
      await client.query(`create database "${name.replaceAll('"', '""')}"`)
  } finally {
    await client.end()
  }
}

/** Avant tous les tests : base de test créée et schéma appliqué (db/init.sql). */
export async function prepareTestDatabase(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL)
  await createDatabaseIfMissing(TEST_DATABASE_URL)
  const pool = createPool(TEST_DATABASE_URL)
  try {
    await applySchema(pool)
  } finally {
    await pool.end()
  }
}
