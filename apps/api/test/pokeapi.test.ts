import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { PokeApiError, createPokeApi, idFromUrl } from '../src/pokeapi.js'

const BASE = 'https://pokeapi.test/api/v2'

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

const LIST = {
  results: [
    { name: 'bulbasaur', url: `${BASE}/pokemon/1/` },
    { name: 'pikachu', url: `${BASE}/pokemon/25/` },
    { name: 'pikachu-rock-star', url: `${BASE}/pokemon/10080/` },
  ],
}

describe('client PokéAPI (fetch mocké)', () => {
  it('get : renvoie le Pokémon quand PokéAPI répond 200', async () => {
    const fetchMock = mockFetch(200, { id: 25, name: 'pikachu', height: 4 })

    await expect(createPokeApi(BASE).get('  Pikachu ')).resolves.toEqual({
      id: 25,
      name: 'pikachu',
    })
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/pokemon/pikachu`)
  })

  it('get : renvoie null quand le Pokémon est introuvable (404)', async () => {
    mockFetch(404, 'Not Found')

    await expect(createPokeApi(BASE).get('pikachoux')).resolves.toBeNull()
  })

  it('get : lève une PokeApiError si PokéAPI est en panne (500)', async () => {
    mockFetch(500)

    await expect(createPokeApi(BASE).get('pikachu')).rejects.toBeInstanceOf(
      PokeApiError,
    )
  })

  it('list : transforme la réponse 200 et la garde en mémoire', async () => {
    const fetchMock = mockFetch(200, LIST)
    const pokeApi = createPokeApi(BASE)

    const expected = [
      { id: 1, name: 'bulbasaur' },
      { id: 25, name: 'pikachu' },
    ]
    await expect(pokeApi.list()).resolves.toEqual(expected)
    await expect(pokeApi.list()).resolves.toEqual(expected)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('list : réessaie au prochain appel après une panne', async () => {
    const pokeApi = createPokeApi(BASE)
    mockFetch(503)
    await expect(pokeApi.list()).rejects.toThrow('PokéAPI a répondu 503')

    mockFetch(200, LIST)
    await expect(pokeApi.list()).resolves.toHaveLength(2)
  })

  it('idFromUrl : extrait le numéro de l’URL', () => {
    expect(idFromUrl(`${BASE}/pokemon/133/`)).toBe(133)
  })

  it('aucun appel réseau réel n’est possible pendant les tests', async () => {
    await expect(createPokeApi(BASE).get('pikachu')).rejects.toThrow(
      'Réseau interdit dans les tests',
    )
  })
})

describe('routes /pokemon (front → API → PokéAPI)', () => {
  const app = () => createApp({ pokeApi: createPokeApi(BASE) })

  it('GET /pokemon renvoie 200 et la liste', async () => {
    mockFetch(200, LIST)

    const res = await app().request('/pokemon')

    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(2)
  })

  it('GET /pokemon/:nom renvoie 200 et le Pokémon', async () => {
    mockFetch(200, { id: 25, name: 'pikachu' })

    const res = await app().request('/pokemon/pikachu')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 25, name: 'pikachu' })
  })

  it('GET /pokemon/:nom renvoie 404 si PokéAPI ne le connaît pas', async () => {
    mockFetch(404, 'Not Found')

    const res = await app().request('/pokemon/pikachoux')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Pokémon introuvable' })
  })

  it('renvoie 502 si PokéAPI est en panne', async () => {
    mockFetch(500)

    expect((await app().request('/pokemon')).status).toBe(502)
    expect((await app().request('/pokemon/pikachu')).status).toBe(502)
  })

  it('renvoie 400 pour un nom invalide', async () => {
    const res = await app().request('/pokemon/pika%20chu!')

    expect(res.status).toBe(400)
  })
})
