import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { API_URL } from '../playwright.config'
import POKEDEX from './pokedex.json' with { type: 'json' }

export { POKEDEX }

/** Clé du cache de la wishlist dans le localStorage du front. */
export const CACHE_KEY = 'poke-wishlist'

// Image PNG transparente de 1×1 pixel, servie à la place des sprites
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

interface Fixtures {
  /** Adresse de l'API Hono lancée pour les tests. */
  api: string
  /** Contenu du localStorage au chargement de la page (`null` = vide). */
  cache: string | null
}

export const test = base.extend<Fixtures>({
  api: API_URL,
  cache: [null, { option: true }],

  page: async ({ page, request, cache }, use) => {
    // Chaque test part d'une wishlist vide côté API…
    expect((await request.delete(`${API_URL}/wishlist`)).status()).toBe(204)

    // …et d'un localStorage contrôlé (vide par défaut) à chaque chargement
    await page.addInitScript(
      ({ key, value }) => {
        if (value === null) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, value)
      },
      { key: CACHE_KEY, value: cache },
    )

    // Les sprites sont simulés (PokéAPI, elle, est simulée côté API)
    await page.route('https://raw.githubusercontent.com/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: PIXEL }),
    )

    await use(page)
  },
})

/**
 * Attend la réponse de l'API Hono à une requête du front. Le front met
 * l'écran à jour tout de suite, avant la réponse : pour vérifier ce que
 * l'API a enregistré, il faut d'abord attendre que sa réponse soit arrivée.
 */
export function apiResponse(page: Page, method: string, path: string) {
  return page.waitForResponse(
    (res) =>
      res.url() === `${API_URL}${path}` && res.request().method() === method,
  )
}

export { expect }
