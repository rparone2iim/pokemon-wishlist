import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPool } from '../src/db.js'
import { readMigrations, runMigrations } from '../src/migrate.js'
import { TEST_DATABASE_URL } from './db.js'

// Une base neuve, rien que pour ces tests : on y installe l'ancien schéma
// (init.sql, sans likes), on y met des données, puis on lance les migrations.
const url = new URL(TEST_DATABASE_URL)
const name = `${url.pathname.slice(1)}_migrations`
url.pathname = `/${name}`
const admin = new URL(TEST_DATABASE_URL)
admin.pathname = '/postgres'

let pool: pg.Pool

async function adminQuery(sql: string) {
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

beforeAll(async () => {
  await adminQuery(`drop database if exists "${name}" with (force)`)
  await adminQuery(`create database "${name}"`)
  pool = createPool(url.toString())
  // Le schéma d'avant les migrations, et une wishlist déjà remplie
  await pool.query(
    await readFile(new URL('../db/init.sql', import.meta.url), 'utf8'),
  )
  await pool.query(
    "insert into wishlist (pokemon_id, name, nickname) values (25, 'pikachu', 'Sparky'), (1, 'bulbasaur', null)",
  )
})

afterAll(async () => {
  await pool.end()
  await adminQuery(`drop database if exists "${name}" with (force)`)
})

describe('runner de migrations SQL', () => {
  it('lit les fichiers db/migrations dans l’ordre', async () => {
    const migrations = await readMigrations()
    expect(migrations.map((m) => m.name)).toContain('001_likes.sql')
    expect(migrations.map((m) => m.version)).toEqual(
      [...migrations.map((m) => m.version)].sort(),
    )
  })

  it('applique 001_likes.sql une fois et garde les données', async () => {
    expect(await runMigrations(pool)).toEqual(['001_likes.sql'])

    const { rows } = await pool.query(
      'select pokemon_id, name, nickname, likes from wishlist order by pokemon_id',
    )
    expect(rows).toEqual([
      { pokemon_id: 1, name: 'bulbasaur', nickname: null, likes: 0 },
      { pokemon_id: 25, name: 'pikachu', nickname: 'Sparky', likes: 0 },
    ])
  })

  it('ne rejoue jamais une migration déjà appliquée', async () => {
    expect(await runMigrations(pool)).toEqual([])
    expect(await runMigrations(pool)).toEqual([])

    const { rows } = await pool.query(
      'select version, name from schema_migrations order by version',
    )
    expect(rows).toEqual([{ version: '001', name: '001_likes.sql' }])
  })

  it('refuse une migration modifiée après avoir été appliquée', async () => {
    await pool.query(
      "update schema_migrations set checksum = 'autre' where version = '001'",
    )

    await expect(runMigrations(pool)).rejects.toThrow(
      'La migration 001_likes.sql a été modifiée',
    )
  })
})
