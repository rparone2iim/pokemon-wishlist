// Applique db/init.sql sur la base de DATABASE_URL (npm run db:init).
import { applySchema, createPool } from '../src/db.js'

const pool = createPool()
try {
  await applySchema(pool)
  console.info(`Schéma appliqué sur ${new URL(process.env.DATABASE_URL!).host}`)
} finally {
  await pool.end()
}
