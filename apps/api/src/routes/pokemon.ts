import { Hono } from 'hono'
import type { PokeApi } from '../pokeapi.js'
import type { ApiError } from '../types.js'

const POKEAPI_DOWN: ApiError = { error: 'PokéAPI ne répond pas' }

/** Les routes qui interrogent PokéAPI à la place du front. */
export function pokemonRoutes(pokeApi: PokeApi) {
  const routes = new Hono()

  // GET /pokemon → 200 et tous les Pokémon
  routes.get('/', async (c) => {
    try {
      return c.json(await pokeApi.list(), 200)
    } catch {
      return c.json(POKEAPI_DOWN, 502)
    }
  })

  // GET /pokemon/:nameOrId → 200 et le Pokémon, 404 s'il n'existe pas
  routes.get('/:nameOrId', async (c) => {
    const key = c.req.param('nameOrId').trim().toLowerCase()
    if (!/^[a-z0-9-]{1,50}$/.test(key))
      return c.json<ApiError>({ error: 'Nom ou numéro invalide' }, 400)
    try {
      const pokemon = await pokeApi.get(key)
      if (!pokemon)
        return c.json<ApiError>({ error: 'Pokémon introuvable' }, 404)
      return c.json(pokemon, 200)
    } catch {
      return c.json(POKEAPI_DOWN, 502)
    }
  })

  return routes
}
