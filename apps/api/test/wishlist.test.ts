import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { MAX_WISHLIST, createWishlistStore } from '../src/store.js'
import type { WishlistItem } from '../src/types.js'

const NOW = new Date('2026-11-02T12:00:00.000Z')
let app: ReturnType<typeof createApp>

/** POST /wishlist avec un corps JSON. */
function post(body: unknown) {
  return app.request('/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  // Une wishlist en mémoire toute neuve pour chaque test
  app = createApp(createWishlistStore(() => NOW))
})

describe('GET /wishlist', () => {
  it('renvoie 200 et une liste vide au départ', async () => {
    const res = await app.request('/wishlist')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('renvoie 200 et les Pokémon ajoutés', async () => {
    await post({ id: 25, name: 'pikachu' })
    await post({ id: 1, name: 'bulbasaur' })

    const res = await app.request('/wishlist')
    const list = (await res.json()) as WishlistItem[]

    expect(res.status).toBe(200)
    expect(list.map((p) => p.name)).toEqual(['pikachu', 'bulbasaur'])
  })
})

describe('POST /wishlist', () => {
  it('renvoie 201 et le Pokémon ajouté', async () => {
    const res = await post({ id: 25, name: ' Pikachu ' })

    expect(res.status).toBe(201)
    expect(res.headers.get('location')).toBe('/wishlist/25')
    expect(await res.json()).toEqual({
      id: 25,
      name: 'pikachu',
      addedAt: NOW.toISOString(),
    })
  })

  it('renvoie 409 pour un doublon', async () => {
    await post({ id: 25, name: 'pikachu' })
    const res = await post({ id: 25, name: 'pikachu' })

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Ce Pokémon est déjà dans la wishlist',
    })
  })

  it(`renvoie 409 au-delà de ${MAX_WISHLIST} Pokémon`, async () => {
    for (let id = 1; id <= MAX_WISHLIST; id++) {
      expect((await post({ id, name: `pokemon-${id}` })).status).toBe(201)
    }

    const res = await post({ id: 25, name: 'pikachu' })

    expect(res.status).toBe(409)
    expect(
      (await (await app.request('/wishlist')).json()) as unknown[],
    ).toHaveLength(MAX_WISHLIST)
  })

  it.each([
    ['JSON invalide', '{pas du json'],
    ['nom manquant', { id: 25 }],
    ['id pas un nombre', { id: '25', name: 'pikachu' }],
    ['id négatif', { id: -1, name: 'pikachu' }],
    ['nom vide', { id: 25, name: '   ' }],
  ])('renvoie 400 si le corps est invalide (%s)', async (_, body) => {
    const res = await post(body)

    expect(res.status).toBe(400)
  })
})

describe('DELETE /wishlist/:id', () => {
  it('renvoie 200 et retire le Pokémon', async () => {
    await post({ id: 25, name: 'pikachu' })

    const res = await app.request('/wishlist/25', { method: 'DELETE' })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 25, name: 'pikachu' })
    expect(await (await app.request('/wishlist')).json()).toEqual([])
  })

  it('renvoie 404 si le Pokémon n’est pas dans la wishlist', async () => {
    const res = await app.request('/wishlist/25', { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: "Ce Pokémon n'est pas dans la wishlist",
    })
  })

  it('renvoie 400 si l’identifiant est invalide', async () => {
    const res = await app.request('/wishlist/abc', { method: 'DELETE' })

    expect(res.status).toBe(400)
  })
})

describe('mémoire', () => {
  it('chaque app a sa propre wishlist', async () => {
    await post({ id: 25, name: 'pikachu' })

    const other = createApp()

    expect(await (await other.request('/wishlist')).json()).toEqual([])
  })
})
