// Applique le schéma sur la base de DATABASE_URL : db/init.sql, puis les
// migrations pas encore appliquées (npm run db:init ou npm run db:migrate).
import { applySchema, createPool } from '../src/db.js'

const pool = createPool()
try {
  const applied = await applySchema(pool)
  const host = new URL(process.env.DATABASE_URL!).host
  console.info(
    applied.length
      ? `Migrations appliquées sur ${host} : ${applied.join(', ')}`
      : `Schéma à jour sur ${host} : aucune migration à appliquer`,
  )
} finally {
  await pool.end()
}
