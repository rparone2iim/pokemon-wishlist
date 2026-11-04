import { describe, expect, it } from 'vitest'
import { createApp as createAppWith } from '../src/app.js'
import { createPgWishlistStore } from '../src/pg-store.js'
import { createTestPool } from './db.js'

// Ces routes ne touchent pas à la wishlist : le pool ne se connecte jamais
const createApp = () =>
  createAppWith({ store: createPgWishlistStore(createTestPool()) })

describe('GET /health', () => {
  it('renvoie 200 avec le statut ok', async () => {
    const res = await createApp().request('/health')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'pokewishlist-api',
      version: 'dev',
    })
  })
})

describe('route inconnue', () => {
  it('renvoie 404 en JSON', async () => {
    const res = await createApp().request('/nimporte-quoi')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Route not found' })
  })
})
