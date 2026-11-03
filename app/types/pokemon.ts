/** Un Pokémon tel qu'on l'utilise dans l'appli (issu de PokéAPI). */
export interface Pokemon {
  id: number
  name: string
}

/** Un Pokémon ajouté à la wishlist, avec sa date d'ajout. */
export interface WishlistItem extends Pokemon {
  addedAt: number
  /** Surnom choisi par le joueur ; absent = on affiche le vrai nom. */
  nickname?: string
}

/** Réponse de https://pokeapi.co/api/v2/pokemon */
export interface PokeApiList {
  count: number
  results: { name: string; url: string }[]
}

/** Réponse de https://pokeapi.co/api/v2/pokemon/{nom ou numéro} (champs utilisés) */
export interface PokeApiPokemon {
  id: number
  name: string
}
