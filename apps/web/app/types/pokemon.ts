/** Un Pokémon tel qu'on l'utilise dans l'appli (issu de PokéAPI). */
export interface Pokemon {
  id: number
  name: string
}

/** Un Pokémon ajouté à la wishlist, avec sa date d'ajout (ISO 8601, donnée par l'API). */
export interface WishlistItem extends Pokemon {
  addedAt: string
  /** Surnom choisi par le joueur ; absent = on affiche le vrai nom. */
  nickname?: string
}
