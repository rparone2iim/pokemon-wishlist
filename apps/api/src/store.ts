import type { Pokemon, WishlistItem } from './types.js'

/** Comme dans le front : 6 Pokémon maximum. */
export const MAX_WISHLIST = 6

export type AddResult =
  { ok: true; item: WishlistItem } | { ok: false; error: 'duplicate' | 'full' }

export interface WishlistStore {
  list: () => WishlistItem[]
  add: (pokemon: Pokemon) => AddResult
  remove: (id: number) => WishlistItem | null
}

/** Wishlist stockée dans un simple tableau en mémoire (pas de base de données). */
export function createWishlistStore(
  now: () => Date = () => new Date(),
): WishlistStore {
  const items: WishlistItem[] = []

  return {
    list: () => [...items],

    add(pokemon) {
      if (items.some((item) => item.id === pokemon.id))
        return { ok: false, error: 'duplicate' }
      if (items.length >= MAX_WISHLIST) return { ok: false, error: 'full' }
      const item: WishlistItem = {
        id: pokemon.id,
        name: pokemon.name,
        addedAt: now().toISOString(),
      }
      items.push(item)
      return { ok: true, item }
    },

    remove(id) {
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) return null
      const [removed] = items.splice(index, 1)
      return removed ?? null
    },
  }
}
