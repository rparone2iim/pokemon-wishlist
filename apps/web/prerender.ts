// Routes /pokemon/[name] à prégénérer au build (étape 11).
// Les noms viennent de PokéAPI ; on se limite aux N premiers (151 par défaut,
// la 1re génération) pour garder un build rapide.

export const DEFAULT_PRERENDER_LIMIT = 151

/** Nombre de fiches à prégénérer, lu dans PRERENDER_POKEMON (0 = aucune). */
export function prerenderLimit(value: string | undefined): number {
  if (value === undefined || value === '') return 0
  if (value === 'true') return DEFAULT_PRERENDER_LIMIT
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? Math.min(n, 2000) : 0
}

/** Les routes /pokemon/<nom> des `limit` premiers Pokémon de PokéAPI. */
export async function pokemonRoutes(
  limit: number,
  pokeApiUrl = 'https://pokeapi.co/api/v2',
): Promise<string[]> {
  if (limit <= 0) return []
  const response = await fetch(
    `${pokeApiUrl.replace(/\/$/, '')}/pokemon?limit=${limit}`,
  )
  if (!response.ok)
    throw new Error(`PokéAPI a répondu ${response.status} (prégénération)`)
  const data = (await response.json()) as { results: { name: string }[] }
  return data.results.slice(0, limit).map((p) => `/pokemon/${p.name}`)
}
