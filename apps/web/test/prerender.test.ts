import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PRERENDER_LIMIT,
  pokemonRoutes,
  prerenderLimit,
} from '../prerender'

afterEach(() => vi.unstubAllGlobals())

describe('prégénération des fiches Pokémon', () => {
  it('lit la limite dans PRERENDER_POKEMON', () => {
    expect(prerenderLimit(undefined)).toBe(0)
    expect(prerenderLimit('')).toBe(0)
    expect(prerenderLimit('0')).toBe(0)
    expect(prerenderLimit('abc')).toBe(0)
    expect(prerenderLimit('true')).toBe(DEFAULT_PRERENDER_LIMIT)
    expect(prerenderLimit('151')).toBe(151)
    expect(prerenderLimit('99999')).toBe(2000)
  })

  it('transforme les noms de PokéAPI en routes, dans la limite', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          results: [{ name: 'bulbasaur' }, { name: 'ivysaur' }],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      pokemonRoutes(2, 'https://pokeapi.test/api/v2/'),
    ).resolves.toEqual(['/pokemon/bulbasaur', '/pokemon/ivysaur'])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pokeapi.test/api/v2/pokemon?limit=2',
    )
  })

  it('ne demande rien quand la limite vaut 0', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(pokemonRoutes(0)).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fait échouer le build si PokéAPI ne répond pas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 503 }))),
    )

    await expect(pokemonRoutes(3)).rejects.toThrow('PokéAPI a répondu 503')
  })
})
