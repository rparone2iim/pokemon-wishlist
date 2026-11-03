import type { Pokemon, PokemonDetails } from './types.js'

export const DEFAULT_POKEAPI_URL = 'https://pokeapi.co/api/v2'

/** Réponse de PokéAPI pour /pokemon?limit=… */
interface PokeApiList {
  results: { name: string; url: string }[]
}

/** Réponse de PokéAPI pour /pokemon/{nom} (champs utilisés). */
interface PokeApiPokemon {
  id: number
  name: string
  height: number
  weight: number
  species?: { name: string }
  types?: { slot: number; type: { name: string } }[]
  abilities?: { is_hidden: boolean; ability: { name: string } }[]
  stats?: { base_stat: number; stat: { name: string } }[]
}

interface Translated {
  language: { name: string }
}

/** Réponse de PokéAPI pour /pokemon-species/{nom} (champs utilisés). */
interface PokeApiSpecies {
  names?: (Translated & { name: string })[]
  genera?: (Translated & { genus: string })[]
  flavor_text_entries?: (Translated & { flavor_text: string })[]
}

type SpeciesInfo = Pick<PokemonDetails, 'localName' | 'genus' | 'description'>

const NO_SPECIES: SpeciesInfo = {
  localName: null,
  genus: null,
  description: null,
}

/** Les entrées d'une liste traduite de PokéAPI dans une langue (« fr », « de »…). */
function inLanguage<T extends Translated>(
  list: T[] = [],
  language: string,
): T[] {
  return list.filter((entry) => entry.language.name === language)
}

/** Les textes du Pokédex contiennent des retours à la ligne et des sauts de page. */
export function cleanFlavorText(text: string): string {
  return text
    .replace(/\u00ad\s*/g, '')
    .replace(/[\s\f]+/g, ' ')
    .trim()
}

/** Transforme les réponses de PokéAPI en fiche Pokémon. */
export function toDetails(
  pokemon: PokeApiPokemon,
  species: SpeciesInfo = NO_SPECIES,
): PokemonDetails {
  return {
    id: pokemon.id,
    name: pokemon.name,
    ...species,
    types: [...(pokemon.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    // PokéAPI donne la taille en décimètres et le poids en hectogrammes
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    abilities: (pokemon.abilities ?? []).map((a) => ({
      name: a.ability.name,
      hidden: a.is_hidden,
    })),
    stats: (pokemon.stats ?? []).map((s) => ({
      name: s.stat.name,
      value: s.base_stat,
    })),
  }
}

/** Erreur quand PokéAPI répond autre chose que 200 ou 404 (ou ne répond pas). */
export class PokeApiError extends Error {
  constructor(public readonly status: number) {
    super(`PokéAPI a répondu ${status}`)
    this.name = 'PokeApiError'
  }
}

/** Extrait le numéro du Pokémon depuis son URL PokéAPI (…/pokemon/25/). */
export function idFromUrl(url: string): number {
  return Number(url.split('/').filter(Boolean).pop())
}

export interface PokeApi {
  /** Tous les Pokémon (formes spéciales exclues, leur id dépasse 10000). */
  list: () => Promise<Pokemon[]>
  /**
   * La fiche d'un Pokémon par nom ou numéro, avec nom, catégorie et description
   * dans la langue demandée (anglais par défaut) ; `null` s'il est introuvable (404).
   */
  get: (
    nameOrId: string | number,
    language?: string,
  ) => Promise<PokemonDetails | null>
}

/**
 * Client PokéAPI utilisé par l'API Hono. La liste complète est gardée en
 * mémoire après le premier appel (elle ne change quasiment jamais).
 */
export function createPokeApi(
  baseUrl: string = process.env.POKEAPI_URL ?? DEFAULT_POKEAPI_URL,
): PokeApi {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`
  let cachedList: Promise<Pokemon[]> | undefined
  // Les fiches déjà demandées, par langue (PokéAPI demande de garder ses réponses en cache)
  const cachedDetails = new Map<string, PokemonDetails>()

  async function fetchList(): Promise<Pokemon[]> {
    const response = await fetch(url('/pokemon?limit=2000'))
    if (!response.ok) throw new PokeApiError(response.status)
    const data = (await response.json()) as PokeApiList
    return data.results
      .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
      .filter((p) => p.id < 10000)
  }

  /** Nom, catégorie et description traduits : un bonus, la fiche s'en passe si besoin. */
  async function fetchSpecies(
    name: string,
    language: string,
  ): Promise<SpeciesInfo> {
    try {
      const response = await fetch(
        url(`/pokemon-species/${encodeURIComponent(name)}`),
      )
      if (!response.ok) return NO_SPECIES
      const species = (await response.json()) as PokeApiSpecies
      const text = inLanguage(species.flavor_text_entries, language).at(
        -1,
      )?.flavor_text
      return {
        localName: inLanguage(species.names, language)[0]?.name ?? null,
        genus: inLanguage(species.genera, language)[0]?.genus ?? null,
        description: text ? cleanFlavorText(text) : null,
      }
    } catch {
      return NO_SPECIES
    }
  }

  return {
    list() {
      cachedList ??= fetchList().catch((error: unknown) => {
        cachedList = undefined // on réessaiera au prochain appel
        throw error
      })
      return cachedList
    },

    async get(nameOrId, language = 'en') {
      const key = String(nameOrId).trim().toLowerCase()
      const cacheKey = `${language}:${key}`
      const cached = cachedDetails.get(cacheKey)
      if (cached) return cached

      const response = await fetch(url(`/pokemon/${encodeURIComponent(key)}`))
      if (response.status === 404) return null
      if (!response.ok) throw new PokeApiError(response.status)
      const pokemon = (await response.json()) as PokeApiPokemon

      const details = toDetails(
        pokemon,
        await fetchSpecies(pokemon.species?.name ?? pokemon.name, language),
      )
      cachedDetails.set(cacheKey, details)
      return details
    },
  }
}
