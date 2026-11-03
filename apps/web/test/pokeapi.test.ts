import { describe, expect, it, vi } from 'vitest'
import {
  POKEAPI_URL,
  PokeApiError,
  fetchPokemon,
  fetchPokemonList,
  idFromUrl,
} from '../app/utils/pokeapi'

/** Remplace fetch par une fausse réponse PokéAPI. */
function mockFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchPokemon', () => {
  it('renvoie le Pokémon quand PokéAPI répond 200', async () => {
    const fetchMock = mockFetch(200, { id: 25, name: 'pikachu', height: 4 })

    const pokemon = await fetchPokemon('  Pikachu ')

    expect(pokemon).toEqual({ id: 25, name: 'pikachu' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(`${POKEAPI_URL}/pokemon/pikachu`)
  })

  it('accepte un numéro', async () => {
    const fetchMock = mockFetch(200, { id: 1, name: 'bulbasaur' })

    await fetchPokemon(1)

    expect(fetchMock).toHaveBeenCalledWith(`${POKEAPI_URL}/pokemon/1`)
  })

  it('renvoie null quand le Pokémon est introuvable (404)', async () => {
    mockFetch(404, 'Not Found')

    await expect(fetchPokemon('pikachoux')).resolves.toBeNull()
  })

  it('lève une PokeApiError si PokéAPI est en panne (500)', async () => {
    mockFetch(500)

    await expect(fetchPokemon('pikachu')).rejects.toBeInstanceOf(PokeApiError)
  })
})

describe('fetchPokemonList', () => {
  it('transforme la réponse 200 en liste de Pokémon', async () => {
    mockFetch(200, {
      count: 3,
      results: [
        { name: 'bulbasaur', url: `${POKEAPI_URL}/pokemon/1/` },
        { name: 'pikachu', url: `${POKEAPI_URL}/pokemon/25/` },
        { name: 'pikachu-rock-star', url: `${POKEAPI_URL}/pokemon/10080/` },
      ],
    })

    await expect(fetchPokemonList()).resolves.toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 25, name: 'pikachu' },
    ])
  })

  it('lève une PokeApiError si la liste ne répond pas', async () => {
    mockFetch(503)

    await expect(fetchPokemonList()).rejects.toThrow('PokéAPI a répondu 503')
  })
})

describe('idFromUrl', () => {
  it('extrait le numéro de l’URL', () => {
    expect(idFromUrl(`${POKEAPI_URL}/pokemon/133/`)).toBe(133)
  })
})

describe('sans mock', () => {
  it('aucun appel réseau réel n’est possible pendant les tests', async () => {
    await expect(fetchPokemon('pikachu')).rejects.toThrow(
      'Réseau interdit dans les tests',
    )
  })
})
