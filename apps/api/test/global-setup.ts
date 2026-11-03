import { createTestPool, prepareTestDatabase, resetDatabase } from './db.js'

// Lancé une fois par Vitest : prépare la base de test, puis la nettoie à la fin.
export default async function setup() {
  await prepareTestDatabase()

  return async function teardown() {
    const pool = createTestPool()
    try {
      await resetDatabase(pool)
    } finally {
      await pool.end()
    }
  }
}
