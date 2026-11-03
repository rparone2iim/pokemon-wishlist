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

/** Fiche détaillée d'un Pokémon (GET /pokemon/:nomOuId), construite depuis PokéAPI. */
export interface PokemonDetails extends Pokemon {
  /** Nom dans la langue demandée (espèce PokéAPI) ; null s'il est inconnu. */
  localName: string | null
  /** Catégorie du Pokédex, par exemple « Mouse Pokémon » ou « Pokémon Souris ». */
  genus: string | null
  /** Description du Pokédex dans la langue demandée. */
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
