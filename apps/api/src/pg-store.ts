import type pg from 'pg'
import type { WishlistStore } from './store.js'
import { normalizeNickname } from './store.js'
import type { WishlistItem } from './types.js'

/** Une ligne de la table wishlist (voir db/init.sql). */
interface WishlistRow {
  pokemon_id: number
  name: string
  nickname: string | null
  added_at: Date
  likes: number
}

const COLUMNS = 'pokemon_id, name, nickname, added_at, likes'

function toItem(row: WishlistRow): WishlistItem {
  return {
    id: row.pokemon_id,
    name: row.name,
    addedAt: row.added_at.toISOString(),
    ...(row.nickname ? { nickname: row.nickname } : {}),
    likes: row.likes,
  }
}

/** Code et contrainte d'une erreur PostgreSQL (23505 doublon, 23514 contrainte). */
function pgError(error: unknown): { code?: string; constraint?: string } {
  return typeof error === 'object' && error !== null
    ? (error as { code?: string; constraint?: string })
    : {}
}

/**
 * Wishlist stockée dans PostgreSQL. Toutes les valeurs passent en paramètres
 * ($1, $2…), jamais concaténées dans le SQL. Doublons et limite de 6 sont
 * garantis par la base (clé primaire et trigger wishlist_max_6).
 */
export function createPgWishlistStore(pool: pg.Pool): WishlistStore {
  return {
    async list() {
      const { rows } = await pool.query<WishlistRow>(
        `select ${COLUMNS} from wishlist order by added_at, pokemon_id`,
      )
      return rows.map(toItem)
    },

    async add(pokemon) {
      try {
        const { rows } = await pool.query<WishlistRow>(
          `insert into wishlist (pokemon_id, name) values ($1, $2)
           returning ${COLUMNS}`,
          [pokemon.id, pokemon.name],
        )
        return { ok: true, item: toItem(rows[0]!) }
      } catch (error) {
        const { code, constraint } = pgError(error)
        if (code === '23505') return { ok: false, error: 'duplicate' }
        if (code === '23514' && constraint === 'wishlist_max_6')
          return { ok: false, error: 'full' }
        throw error
      }
    },

    async remove(id) {
      const { rows } = await pool.query<WishlistRow>(
        `delete from wishlist where pokemon_id = $1 returning ${COLUMNS}`,
        [id],
      )
      return rows[0] ? toItem(rows[0]) : null
    },

    async rename(id, nickname) {
      const found = await pool.query<Pick<WishlistRow, 'name'>>(
        'select name from wishlist where pokemon_id = $1',
        [id],
      )
      const current = found.rows[0]
      if (!current) return null
      const { rows } = await pool.query<WishlistRow>(
        `update wishlist set nickname = $2 where pokemon_id = $1
         returning ${COLUMNS}`,
        [id, normalizeNickname(nickname, current.name) ?? null],
      )
      return rows[0] ? toItem(rows[0]) : null
    },

    async like(id) {
      const { rows } = await pool.query<WishlistRow>(
        `update wishlist set likes = likes + 1 where pokemon_id = $1
         returning ${COLUMNS}`,
        [id],
      )
      return rows[0] ? toItem(rows[0]) : null
    },

    async unlike(id) {
      const { rows } = await pool.query<WishlistRow>(
        `update wishlist set likes = greatest(likes - 1, 0) where pokemon_id = $1
         returning ${COLUMNS}`,
        [id],
      )
      return rows[0] ? toItem(rows[0]) : null
    },

    async clear() {
      await pool.query('delete from wishlist')
    },
  }
}
