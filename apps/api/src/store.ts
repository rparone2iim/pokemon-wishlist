import type { Pokemon, WishlistItem } from './types.js'

/** Comme dans le front : 6 Pokémon maximum. */
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

/**
 * La règle des 6 Pokémon : ajoute un Pokémon à la liste sans la modifier,
 * refuse les doublons et les ajouts quand la liste est pleine.
 */
export function addPokemon(
  list: readonly WishlistItem[],
  pokemon: Pokemon,
  now: Date = new Date(),
): AddResult & { list: readonly WishlistItem[] } {
  if (list.some((item) => item.id === pokemon.id))
    return { ok: false, error: 'duplicate', list }
  if (list.length >= MAX_WISHLIST) return { ok: false, error: 'full', list }
  const item: WishlistItem = {
    id: pokemon.id,
    name: pokemon.name,
    addedAt: now.toISOString(),
  }
  return { ok: true, item, list: [...list, item] }
}

/** Où la wishlist est gardée : PostgreSQL (pg-store.ts) ou la mémoire (tests). */
export interface WishlistStore {
  list: () => Promise<WishlistItem[]>
  add: (pokemon: Pokemon) => Promise<AddResult>
  remove: (id: number) => Promise<WishlistItem | null>
  rename: (id: number, nickname: string) => Promise<WishlistItem | null>
  clear: () => Promise<void>
}

/** Wishlist dans un simple tableau en mémoire, utilisée par les tests de routes. */
export function createWishlistStore(
  now: () => Date = () => new Date(),
): WishlistStore {
  const items: WishlistItem[] = []

  return {
    list: async () => [...items],

    async add(pokemon) {
      const result = addPokemon(items, pokemon, now())
      if (!result.ok) return { ok: false, error: result.error }
      items.push(result.item)
      return { ok: true, item: result.item }
    },

    async remove(id) {
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) return null
      const [removed] = items.splice(index, 1)
      return removed ?? null
    },

    async rename(id, nickname) {
      const index = items.findIndex((item) => item.id === id)
      const current = items[index]
      if (!current) return null
      const base: WishlistItem = {
        id: current.id,
        name: current.name,
        addedAt: current.addedAt,
      }
      const clean = normalizeNickname(nickname, current.name)
      const renamed = clean ? { ...base, nickname: clean } : base
      items[index] = renamed
      return renamed
    },

    async clear() {
      items.length = 0
    },
  }
}
