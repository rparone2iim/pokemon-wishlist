import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { API_URL, WEB_URL } from '../playwright.config'
import POKEDEX from './pokedex.json' with { type: 'json' }

export { POKEDEX }

/** Clé du cache de la wishlist dans le localStorage du front. */
export const CACHE_KEY = 'poke-wishlist'
/** Cookie de la langue choisie (lu aussi par le serveur, en SSR). */
export const LANG_COOKIE = 'pokewishlist-lang'

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
  /**
   * Langue de l'appli imposée à chaque chargement. Les scénarios historiques
   * vérifient des textes en français : ils demandent « fr ». `null` laisse
   * l'appli choisir (anglais par défaut, puis la langue gardée).
   */
  lang: 'en' | 'fr' | 'es' | 'de' | null
}

export const test = base.extend<Fixtures>({
  api: API_URL,
  cache: [null, { option: true }],
  lang: ['fr', { option: true }],

  page: async ({ page, request, cache, lang }, use) => {
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
    if (lang !== null)
      await page
        .context()
        .addCookies([{ name: LANG_COOKIE, value: lang, url: WEB_URL }])

    // SSR : la page rendue par le serveur doit correspondre exactement à celle
    // du navigateur. Vue signale toute différence d'hydratation dans la console.
    const hydration: string[] = []
    page.on('console', (message) => {
      if (/hydration/i.test(message.text())) hydration.push(message.text())
    })

    // Les sprites sont simulés (PokéAPI, elle, est simulée côté API)
    await page.route('https://raw.githubusercontent.com/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: PIXEL }),
    )

    await use(page)

    expect(hydration, 'différences d’hydratation SSR').toEqual([])
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
