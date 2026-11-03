import { Hono } from 'hono'
import type { AppEnv } from '../i18n.js'
import { t } from '../i18n.js'
import type { PokeApi } from '../pokeapi.js'
import type { ApiError } from '../types.js'

/** Les routes qui interrogent PokéAPI à la place du front. */
export function pokemonRoutes(pokeApi: PokeApi) {
  const routes = new Hono<AppEnv>()

  // GET /pokemon → 200 et tous les Pokémon
  routes.get('/', async (c) => {
    try {
      return c.json(await pokeApi.list(), 200)
    } catch {
      return c.json<ApiError>({ error: t(c, 'pokeApiDown') }, 502)
    }
  })

  // GET /pokemon/:nameOrId → 200 et la fiche (dans la langue demandée), 404 s'il n'existe pas
  routes.get('/:nameOrId', async (c) => {
    const key = c.req.param('nameOrId').trim().toLowerCase()
    if (!/^[a-z0-9-]{1,50}$/.test(key))
      return c.json<ApiError>({ error: t(c, 'invalidName') }, 400)
    try {
      const pokemon = await pokeApi.get(key, c.get('language'))
      if (!pokemon)
        return c.json<ApiError>({ error: t(c, 'pokemonNotFound') }, 404)
      return c.json(pokemon, 200)
    } catch {
      return c.json<ApiError>({ error: t(c, 'pokeApiDown') }, 502)
    }
  })

  return routes
}
