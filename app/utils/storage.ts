import type { WishlistItem } from '../types/pokemon'

export const STORAGE_KEY = 'poke-wishlist'

/** Le strict nécessaire de l'API Storage (localStorage, ou un faux en test). */
export type WishlistStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Lit la wishlist sauvegardée dans le navigateur. */
export function loadWishlist(storage: WishlistStorage): WishlistItem[] {
  const raw = storage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as WishlistItem[]) : []
}

/** Sauvegarde la wishlist dans le navigateur. */
export function saveWishlist(
  storage: WishlistStorage,
  list: readonly WishlistItem[],
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(list))
}
