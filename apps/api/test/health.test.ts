import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /health', () => {
  it('renvoie 200 avec le statut ok', async () => {
    const res = await createApp().request('/health')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'pokewishlist-api',
    })
  })
})

describe('route inconnue', () => {
  it('renvoie 404 en JSON', async () => {
    const res = await createApp().request('/nimporte-quoi')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Route introuvable' })
  })
})
