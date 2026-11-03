/** Un Pokémon envoyé par le front (issu de PokéAPI). */
export interface Pokemon {
  id: number
  name: string
}

/** Un Pokémon dans la wishlist, avec sa date d'ajout (ISO 8601). */
export interface WishlistItem extends Pokemon {
  addedAt: string
  /** Surnom choisi par le joueur ; absent = le vrai nom est affiché. */
  nickname?: string
}

export interface ApiError {
  error: string
  /** Raison précise d'un refus (409) : doublon ou wishlist pleine. */
  code?: 'duplicate' | 'full'
}
