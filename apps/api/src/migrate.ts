import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import type pg from 'pg'

/** Les migrations : db/migrations/001_nom.sql, 002_….sql, appliquées dans l'ordre. */
export const MIGRATIONS_DIR = new URL('../db/migrations/', import.meta.url)

const FILE_NAME = /^(\d{3})_[a-z0-9_]+\.sql$/

export interface Migration {
  version: string
  name: string
  sql: string
  checksum: string
}

/** Lit les fichiers .sql du dossier, triés par numéro. */
export async function readMigrations(
  dir: URL = MIGRATIONS_DIR,
): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  return Promise.all(
    files.map(async (name) => {
      const match = FILE_NAME.exec(name)
      if (!match)
        throw new Error(
          `Nom de migration invalide : ${name} (attendu : 001_nom.sql)`,
        )
      const sql = await readFile(new URL(name, dir), 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      return { version: match[1]!, name, sql, checksum }
    }),
  )
}

/**
 * Runner SQL maison : applique une seule fois chaque migration pas encore
 * notée dans schema_migrations, chacune dans sa propre transaction (tout ou
 * rien). Renvoie les migrations appliquées pendant cet appel.
 *
 * Utilise un verrou de session : à lancer avec une connexion directe ou le
 * pooler Supabase en mode session (port 5432), pas en mode transaction.
 */
export async function runMigrations(
  pool: pg.Pool,
  dir: URL = MIGRATIONS_DIR,
): Promise<string[]> {
  const migrations = await readMigrations(dir)
  const client = await pool.connect()
  try {
    // Deux lancements en même temps (deux déploiements) : un seul à la fois
    await client.query('select pg_advisory_lock(hashtext($1))', [
      'schema_migrations',
    ])
    await client.query(`
      create table if not exists public.schema_migrations (
        version text primary key,
        name text not null,
        checksum text not null,
        applied_at timestamptz not null default now()
      );
      alter table public.schema_migrations enable row level security;
    `)
    const { rows } = await client.query<{ version: string; checksum: string }>(
      'select version, checksum from public.schema_migrations',
    )
    const applied = new Map(rows.map((row) => [row.version, row.checksum]))

    const done: string[] = []
    for (const migration of migrations) {
      const checksum = applied.get(migration.version)
      if (checksum !== undefined) {
        // Une migration déjà appliquée ne doit plus changer : on en écrit une nouvelle
        if (checksum !== migration.checksum)
          throw new Error(
            `La migration ${migration.name} a été modifiée après avoir été appliquée`,
          )
        continue
      }
      await client.query('begin')
      try {
        await client.query(migration.sql)
        await client.query(
          'insert into public.schema_migrations (version, name, checksum) values ($1, $2, $3)',
          [migration.version, migration.name, migration.checksum],
        )
        await client.query('commit')
        done.push(migration.name)
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    }
    return done
  } finally {
    await client
      .query('select pg_advisory_unlock(hashtext($1))', ['schema_migrations'])
      .catch(() => undefined)
    client.release()
  }
}
