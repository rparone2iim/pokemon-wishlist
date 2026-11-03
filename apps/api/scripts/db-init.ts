// Applique db/init.sql sur la base de DATABASE_URL (npm run db:init).
import { readFile } from 'node:fs/promises'
import { createPool } from '../src/db.js'

const pool = createPool()
try {
  await pool.query(
    await readFile(new URL('../db/init.sql', import.meta.url), 'utf8'),
  )
  console.info(`Schéma appliqué sur ${new URL(process.env.DATABASE_URL!).host}`)
} finally {
  await pool.end()
}
