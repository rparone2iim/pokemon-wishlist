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

/** Fiche détaillée d'un Pokémon, renvoyée par l'API Hono (GET /pokemon/:nom). */
export interface PokemonDetails extends Pokemon {
  /** Nom français ; null s'il est inconnu. */
  frenchName: string | null
  /** Catégorie du Pokédex, par exemple « Pokémon Souris ». */
  genus: string | null
  /** Description du Pokédex en français. */
  description: string | null
  /** Types en anglais, comme dans PokéAPI (« electric »…). */
  types: string[]
  /** Taille en mètres. */
  height: number
  /** Poids en kilos. */
  weight: number
  abilities: { name: string; hidden: boolean }[]
  /** Statistiques de base (« hp », « attack »…). */
  stats: { name: string; value: number }[]
}
