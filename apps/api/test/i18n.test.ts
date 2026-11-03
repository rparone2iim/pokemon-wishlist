import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { translate } from '../src/i18n.js'
import { createPgWishlistStore } from '../src/pg-store.js'
import { createTestPool, resetDatabase } from './db.js'

// Les erreurs de l'API Hono sont traduites : anglais par défaut, puis fr, es, de
const pool = createTestPool()
const app = createApp({ store: createPgWishlistStore(pool) })

beforeEach(() => resetDatabase(pool))
afterAll(() => pool.end())

async function errorOf(path: string, init?: RequestInit) {
  const res = await app.request(path, init)
  return ((await res.json()) as { error: string }).error
}

const deleteMissing = (headers: Record<string, string> = {}) =>
  errorOf('/wishlist/25', { method: 'DELETE', headers })

describe('erreurs de l’API traduites', () => {
  it('répond en anglais par défaut', async () => {
    expect(await deleteMissing()).toBe('This Pokémon is not in the wishlist')
  })

  it.each([
    ['fr', "Ce Pokémon n'est pas dans la wishlist"],
    ['es', 'Este Pokémon no está en la lista de deseos'],
    ['de', 'Dieses Pokémon ist nicht auf der Wunschliste'],
  ])('répond en %s selon Accept-Language', async (lang, message) => {
    expect(await deleteMissing({ 'Accept-Language': lang })).toBe(message)
  })

  it('comprend un en-tête de navigateur (« de-DE,de;q=0.9 »)', async () => {
    expect(
      await deleteMissing({ 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' }),
    ).toBe('Dieses Pokémon ist nicht auf der Wunschliste')
  })

  it('accepte aussi ?lang=', async () => {
    expect(await errorOf('/nimporte-quoi?lang=es')).toBe('Ruta no encontrada')
  })

  it('revient à l’anglais pour une langue non prise en charge', async () => {
    expect(await deleteMissing({ 'Accept-Language': 'it-IT' })).toBe(
      'This Pokémon is not in the wishlist',
    )
  })

  it('traduit les messages avec paramètre (wishlist pleine)', async () => {
    for (let id = 1; id <= 6; id++) {
      await app.request('/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: `pokemon-${id}` }),
      })
    }

    const error = await errorOf('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': 'fr' },
      body: JSON.stringify({ id: 25, name: 'pikachu' }),
    })

    expect(error).toBe('La wishlist est pleine (6 max)')
  })
})

describe('translate', () => {
  it('remplace les paramètres', () => {
    expect(translate('de', 'full', { max: 6 })).toBe(
      'Die Wunschliste ist voll (max. 6)',
    )
  })

  it('revient à l’anglais pour une langue inconnue', () => {
    expect(translate('xx', 'invalidId')).toBe('Invalid id')
  })
})
