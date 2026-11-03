import type { PokeApiList, PokeApiPokemon, Pokemon } from '../types/pokemon'

export const POKEAPI_URL = 'https://pokeapi.co/api/v2'

/** Erreur renvoyée quand PokéAPI répond autre chose que 200 ou 404. */
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

/** Liste de tous les Pokémon (formes spéciales exclues, leur id dépasse 10000). */
export async function fetchPokemonList(
  limit: number = 2000,
): Promise<Pokemon[]> {
  const response = await fetch(`${POKEAPI_URL}/pokemon?limit=${limit}`)
  if (!response.ok) throw new PokeApiError(response.status)
  const data = (await response.json()) as PokeApiList
  return data.results
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((p) => p.id < 10000)
}

/** Un Pokémon par nom ou numéro ; `null` s'il est introuvable (404). */
export async function fetchPokemon(
  nameOrId: string | number,
): Promise<Pokemon | null> {
  const key = String(nameOrId).trim().toLowerCase()
  const response = await fetch(
    `${POKEAPI_URL}/pokemon/${encodeURIComponent(key)}`,
  )
  if (response.status === 404) return null
  if (!response.ok) throw new PokeApiError(response.status)
  const data = (await response.json()) as PokeApiPokemon
  return { id: data.id, name: data.name }
}
