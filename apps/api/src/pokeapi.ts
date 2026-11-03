import type { Pokemon } from './types.js'

export const DEFAULT_POKEAPI_URL = 'https://pokeapi.co/api/v2'

/** Réponse de PokéAPI pour /pokemon?limit=… */
interface PokeApiList {
  results: { name: string; url: string }[]
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
  /** Un Pokémon par nom ou numéro ; `null` s'il est introuvable (404). */
  get: (nameOrId: string | number) => Promise<Pokemon | null>
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

  async function fetchList(): Promise<Pokemon[]> {
    const response = await fetch(url('/pokemon?limit=2000'))
    if (!response.ok) throw new PokeApiError(response.status)
    const data = (await response.json()) as PokeApiList
    return data.results
      .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
      .filter((p) => p.id < 10000)
  }

  return {
    list() {
      cachedList ??= fetchList().catch((error: unknown) => {
        cachedList = undefined // on réessaiera au prochain appel
        throw error
      })
      return cachedList
    },

    async get(nameOrId) {
      const key = String(nameOrId).trim().toLowerCase()
      const response = await fetch(url(`/pokemon/${encodeURIComponent(key)}`))
      if (response.status === 404) return null
      if (!response.ok) throw new PokeApiError(response.status)
      const data = (await response.json()) as Pokemon
      return { id: data.id, name: data.name }
    },
  }
}
