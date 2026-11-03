import type { WishlistItem } from '../types/pokemon'

export const STORAGE_KEY = 'poke-wishlist'

/** Le strict nécessaire de l'API Storage (localStorage, ou un faux en test). */
export type WishlistStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Garde uniquement les entrées valides d'une wishlist venue du stockage. */
function toWishlistItem(value: unknown): WishlistItem | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, name, addedAt, nickname } = value as Record<string, unknown>
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null
  if (typeof name !== 'string' || !name) return null
  return {
    id,
    name,
    addedAt: typeof addedAt === 'string' ? addedAt : '',
    ...(typeof nickname === 'string' && nickname ? { nickname } : {}),
  }
}

/**
 * Lit la wishlist sauvegardée. Ne plante jamais : stockage vide,
 * JSON invalide ou stockage inaccessible donnent une liste vide.
 */
export function loadWishlist(storage: WishlistStorage): WishlistItem[] {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const seen = new Set<number>()
  return data.flatMap((value) => {
    const item = toWishlistItem(value)
    if (!item || seen.has(item.id)) return []
    seen.add(item.id)
    return [item]
  })
}

/** Sauvegarde la wishlist ; renvoie false si le stockage refuse (plein, bloqué). */
export function saveWishlist(
  storage: WishlistStorage,
  list: readonly WishlistItem[],
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}
