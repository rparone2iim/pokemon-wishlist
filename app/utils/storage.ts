export const STORAGE_KEY = 'poke-wishlist'

/** Lit la wishlist sauvegardée dans le navigateur. */
export function loadWishlist(storage) {
  const raw = storage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

/** Sauvegarde la wishlist dans le navigateur. */
export function saveWishlist(storage, list) {
  storage.setItem(STORAGE_KEY, JSON.stringify(list))
}
