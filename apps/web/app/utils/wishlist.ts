import type { Pokemon, WishlistItem } from '../types/pokemon'
import { displayName } from './pokemon'

/** Comme une équipe dans les jeux : 6 Pokémon maximum. */
export const MAX_WISHLIST = 6

/** Longueur max d'un surnom, comme dans les jeux. */
export const MAX_NICKNAME = 12

/** `network` : l'API n'a pas pu enregistrer l'ajout. */
export type AddError = 'duplicate' | 'full' | 'network'

export type AddResult =
  | { ok: true; list: WishlistItem[] }
  | {
      ok: false
      error: AddError
      list: readonly WishlistItem[]
      /** Message de l'API (dans la langue choisie) quand c'est elle qui refuse. */
      message?: string
    }

export function isInWishlist(
  list: readonly WishlistItem[],
  id: number,
): boolean {
  return list.some((item) => item.id === id)
}

export function isWishlistFull(list: readonly WishlistItem[]): boolean {
  return list.length >= MAX_WISHLIST
}

/** Ajoute un Pokémon sans modifier la liste d'origine (refuse doublons et liste pleine). */
export function addPokemon(
  list: readonly WishlistItem[],
  pokemon: Pokemon,
  now: string = new Date().toISOString(),
): AddResult {
  if (isInWishlist(list, pokemon.id))
    return { ok: false, error: 'duplicate', list }
  if (isWishlistFull(list)) return { ok: false, error: 'full', list }
  return {
    ok: true,
    list: [...list, { id: pokemon.id, name: pokemon.name, addedAt: now }],
  }
}

export function removePokemon(
  list: readonly WishlistItem[],
  id: number,
): WishlistItem[] {
  return list.filter((item) => item.id !== id)
}

/** Nom affiché : le surnom s'il y en a un, sinon le vrai nom du Pokémon. */
export function nicknameOf(item: WishlistItem): string {
  return item.nickname ?? displayName(item.name)
}

/**
 * Renomme un Pokémon de la wishlist (sans modifier la liste d'origine).
 * Un surnom vide ou identique au vrai nom remet le nom de base.
 */
export function renamePokemon(
  list: readonly WishlistItem[],
  id: number,
  nickname: string,
): WishlistItem[] {
  const clean = nickname.trim().replace(/\s+/g, ' ').slice(0, MAX_NICKNAME)
  return list.map((item) => {
    if (item.id !== id) return item
    const { nickname: _old, ...base } = item
    const isBaseName =
      !clean || clean.toLowerCase() === displayName(item.name).toLowerCase()
    return isBaseName ? base : { ...base, nickname: clean }
  })
}
