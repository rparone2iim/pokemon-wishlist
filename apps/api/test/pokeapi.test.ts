import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createPgWishlistStore } from '../src/pg-store.js'
import {
  PokeApiError,
  cleanFlavorText,
  createPokeApi,
  idFromUrl,
} from '../src/pokeapi.js'
import { createTestPool } from './db.js'

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

/** Remplace fetch par une fausse PokéAPI qui répond selon l'URL (404 sinon). */
function mockPokeApi(routes: Record<string, [number, unknown]>) {
  const fetchMock = vi.fn((input: string | URL | Request) => {
    const path = String(input).replace(BASE, '')
    const [status, body] = routes[path] ?? [404, 'Not Found']
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Extraits des vraies réponses de PokéAPI pour Pikachu. */
const PIKACHU = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  species: { name: 'pikachu' },
  types: [{ slot: 1, type: { name: 'electric' } }],
  abilities: [
    { is_hidden: false, ability: { name: 'static' } },
    { is_hidden: true, ability: { name: 'lightning-rod' } },
  ],
  stats: [
    { base_stat: 35, stat: { name: 'hp' } },
    { base_stat: 90, stat: { name: 'speed' } },
  ],
}
const PIKACHU_SPECIES = {
  names: ['en', 'fr', 'es', 'de'].map((lang) => ({
    name: 'Pikachu',
    language: { name: lang },
  })),
  genera: [
    { genus: 'Mouse Pokémon', language: { name: 'en' } },
    { genus: 'Pokémon Souris', language: { name: 'fr' } },
    { genus: 'Pokémon Ratón', language: { name: 'es' } },
    { genus: 'Maus', language: { name: 'de' } },
  ],
  flavor_text_entries: [
    {
      flavor_text: 'It stores\nelectricity\fin its cheeks.',
      language: { name: 'en' },
    },
    {
      flavor_text: 'Il stocke\nl’électricité\fdans ses joues.',
      language: { name: 'fr' },
    },
  ],
}
/** La fiche attendue, en anglais (la langue par défaut). */
const PIKACHU_DETAILS = {
  id: 25,
  name: 'pikachu',
  localName: 'Pikachu',
  genus: 'Mouse Pokémon',
  description: 'It stores electricity in its cheeks.',
  types: ['electric'],
  height: 0.4,
  weight: 6,
  abilities: [
    { name: 'static', hidden: false },
    { name: 'lightning-rod', hidden: true },
  ],
  stats: [
    { name: 'hp', value: 35 },
    { name: 'speed', value: 90 },
  ],
}
const PIKACHU_ROUTES: Record<string, [number, unknown]> = {
  '/pokemon/pikachu': [200, PIKACHU],
  '/pokemon-species/pikachu': [200, PIKACHU_SPECIES],
}

const LIST = {
  results: [
    { name: 'bulbasaur', url: `${BASE}/pokemon/1/` },
    { name: 'pikachu', url: `${BASE}/pokemon/25/` },
    { name: 'pikachu-rock-star', url: `${BASE}/pokemon/10080/` },
  ],
}

describe('client PokéAPI (fetch mocké)', () => {
  it('get : renvoie la fiche du Pokémon en anglais par défaut', async () => {
    const fetchMock = mockPokeApi(PIKACHU_ROUTES)

    await expect(createPokeApi(BASE).get('  Pikachu ')).resolves.toEqual(
      PIKACHU_DETAILS,
    )
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/pokemon/pikachu`)
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/pokemon-species/pikachu`)
  })

  it('get : catégorie et description dans la langue demandée', async () => {
    mockPokeApi(PIKACHU_ROUTES)

    await expect(createPokeApi(BASE).get('pikachu', 'fr')).resolves.toEqual({
      ...PIKACHU_DETAILS,
      genus: 'Pokémon Souris',
      description: 'Il stocke l’électricité dans ses joues.',
    })
  })

  it('get : garde les fiches en mémoire, par langue', async () => {
    const fetchMock = mockPokeApi(PIKACHU_ROUTES)
    const pokeApi = createPokeApi(BASE)

    await pokeApi.get('pikachu')
    await pokeApi.get('PIKACHU')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await expect(pokeApi.get('pikachu', 'de')).resolves.toMatchObject({
      genus: 'Maus',
    })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('get : donne quand même la fiche si l’espèce ne répond pas', async () => {
    mockPokeApi({
      '/pokemon/pikachu': [200, PIKACHU],
      '/pokemon-species/pikachu': [500, {}],
    })

    await expect(createPokeApi(BASE).get('pikachu')).resolves.toMatchObject({
      id: 25,
      localName: null,
      genus: null,
      description: null,
      types: ['electric'],
    })
  })

  it('cleanFlavorText : retire retours à la ligne et sauts de page', () => {
    expect(cleanFlavorText('Une\ndescription\f du Poké\u00ad\ndex ')).toBe(
      'Une description du Pokédex',
    )
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
  // Ces routes ne touchent pas à la wishlist : le pool ne se connecte jamais
  const store = createPgWishlistStore(createTestPool())
  const app = () => createApp({ store, pokeApi: createPokeApi(BASE) })

  it('GET /pokemon renvoie 200 et la liste', async () => {
    mockFetch(200, LIST)

    const res = await app().request('/pokemon')

    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(2)
  })

  it('GET /pokemon/:nom renvoie 200 et la fiche du Pokémon', async () => {
    mockPokeApi(PIKACHU_ROUTES)

    const res = await app().request('/pokemon/pikachu')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(PIKACHU_DETAILS)
  })

  it('GET /pokemon/:nom donne la fiche dans la langue du front', async () => {
    mockPokeApi(PIKACHU_ROUTES)

    const res = await app().request('/pokemon/pikachu', {
      headers: { 'Accept-Language': 'es-ES,es;q=0.9' },
    })

    expect(await res.json()).toMatchObject({ genus: 'Pokémon Ratón' })
  })

  it('GET /pokemon/:nom renvoie 404 si PokéAPI ne le connaît pas', async () => {
    mockFetch(404, 'Not Found')

    const res = await app().request('/pokemon/pikachoux')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Pokémon not found' })
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
