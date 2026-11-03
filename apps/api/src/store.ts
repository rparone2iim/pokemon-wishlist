import type { Pokemon, WishlistItem } from './types.js'

/** Comme dans le front : 6 Pokémon maximum (garanti par la base, voir db/init.sql). */
export const MAX_WISHLIST = 6

/** Longueur max d'un surnom, comme dans les jeux. */
export const MAX_NICKNAME = 12

/**
 * Nettoie un surnom. Renvoie `undefined` (= pas de surnom) s'il est vide
 * ou identique au vrai nom du Pokémon.
 */
export function normalizeNickname(
  nickname: string,
  name: string,
): string | undefined {
  const clean = nickname.trim().replace(/\s+/g, ' ').slice(0, MAX_NICKNAME)
  const baseName = name.replace(/-/g, ' ')
  if (!clean || clean.toLowerCase() === baseName.toLowerCase()) return undefined
  return clean
}

export type AddResult =
  { ok: true; item: WishlistItem } | { ok: false; error: 'duplicate' | 'full' }

/** Où la wishlist est gardée : PostgreSQL (pg-store.ts). */
export interface WishlistStore {
  list: () => Promise<WishlistItem[]>
  add: (pokemon: Pokemon) => Promise<AddResult>
  remove: (id: number) => Promise<WishlistItem | null>
  rename: (id: number, nickname: string) => Promise<WishlistItem | null>
  /** +1 like ; `null` si le Pokémon n'est pas dans la wishlist. */
  like: (id: number) => Promise<WishlistItem | null>
  /** −1 like (jamais sous 0) ; `null` si le Pokémon n'est pas dans la wishlist. */
  unlike: (id: number) => Promise<WishlistItem | null>
  clear: () => Promise<void>
}
