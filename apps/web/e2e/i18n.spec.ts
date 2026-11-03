import type { Page } from '@playwright/test'
import { LANG_COOKIE, apiResponse, expect, test } from './fixtures'

// Quatre langues : anglais par défaut, français, espagnol, allemand.
// Changer de langue modifie l'interface ET les messages de l'API Hono.

// Pas de langue imposée : l'appli choisit seule (anglais par défaut)
test.use({ lang: null })

const switcher = (page: Page) =>
  page.getByRole('group', { name: /Language|Langue|Idioma|Sprache/ })
const choose = (page: Page, code: string) =>
  switcher(page).getByRole('button', { name: code, exact: true }).click()
const search = (page: Page) => page.getByRole('searchbox')

test.describe('i18n : 4 langues', () => {
  test('l’appli est en anglais par défaut (même avec un navigateur en français)', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: '> Start' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(
      switcher(page).getByRole('button', { name: 'en', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('changer de langue traduit l’interface', async ({ page }) => {
    await page.goto('/wishlist')
    await expect(search(page)).toHaveAttribute(
      'placeholder',
      'Name or number...',
    )

    const expected = [
      ['fr', 'Nom ou numéro...', 'Ta wishlist est vide.', 'Ma wishlist'],
      [
        'es',
        'Nombre o número...',
        'Tu lista de deseos está vacía.',
        'Mi lista de deseos',
      ],
      [
        'de',
        'Name oder Nummer...',
        'Deine Wunschliste ist leer.',
        'Meine Wunschliste',
      ],
      ['en', 'Name or number...', 'Your wishlist is empty.', 'My wishlist'],
    ]
    for (const [code, placeholder, empty, title] of expected) {
      await choose(page, code!)
      await expect(search(page)).toHaveAttribute('placeholder', placeholder!)
      await expect(page.getByText(empty!)).toBeVisible()
      await expect(page).toHaveTitle(`${title} · PokéWishlist`)
      await expect(page.locator('html')).toHaveAttribute('lang', code!)
    }
  })

  test('changer de langue change aussi le message de l’API (404)', async ({
    page,
  }) => {
    await page.goto('/pokemon/pikachoux')
    await expect(page.getByText('Pokémon not found')).toBeVisible()

    const messages = [
      ['fr', 'Pokémon introuvable', 'Pokémon inconnu'],
      ['es', 'Pokémon no encontrado', 'Pokémon desconocido'],
      ['de', 'Pokémon nicht gefunden', 'Unbekanntes Pokémon'],
    ]
    for (const [code, apiMessage, uiTitle] of messages) {
      // La fiche est redemandée à l'API avec la nouvelle langue
      const answer = page.waitForResponse((res) =>
        res.url().endsWith('/pokemon/pikachoux'),
      )
      await choose(page, code!)
      const res = await answer
      expect(await res.request().headerValue('accept-language')).toBe(code)
      expect(await res.json()).toEqual({ error: apiMessage })

      await expect(page.getByText(apiMessage!)).toBeVisible()
      await expect(page.getByRole('heading', { name: uiTitle })).toBeVisible()
    }
  })

  test('le refus de l’API (409) s’affiche dans la langue choisie', async ({
    page,
    request,
    api,
  }) => {
    const firstLoad = apiResponse(page, 'GET', '/wishlist')
    await page.goto('/wishlist')
    await firstLoad
    await choose(page, 'de')

    // Un autre client ajoute Pikachu pendant ce temps
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })

    await search(page).fill('pikachu')
    await page.getByRole('button', { name: '+ Hinzufügen' }).first().click()

    await expect(page.locator('[aria-live] p')).toContainText(
      'Dieses Pokémon ist schon auf der Wunschliste',
    )
  })

  test('la fiche Pokémon suit la langue (nom, catégorie, types, nombres)', async ({
    page,
  }) => {
    await page.goto('/pokemon/bulbasaur')
    const fiche = page.getByRole('article')
    await expect(fiche.getByRole('heading', { level: 1 })).toHaveText(
      /Bulbasaur/i,
    )
    await expect(fiche).toContainText('Test Pokémon')
    await expect(fiche).toContainText(/Grass/i)
    await expect(fiche).toContainText('0.4 m')

    await choose(page, 'fr')
    await expect(fiche.getByRole('heading', { level: 1 })).toHaveText(
      /Bulbizarre/i,
    )
    await expect(fiche).toContainText('Pokémon Test')
    await expect(fiche).toContainText(/Plante/i)
    await expect(fiche).toContainText('0,4 m')
    await expect(page.getByRole('meter', { name: 'PV' })).toBeVisible()

    await choose(page, 'de')
    await expect(fiche).toContainText('Test-Pokémon')
    await expect(fiche).toContainText(/Pflanze/i)
    await expect(page.getByRole('meter', { name: 'KP' })).toBeVisible()
  })

  test('la langue choisie est gardée après un rechargement', async ({
    page,
  }) => {
    await page.goto('/')
    await choose(page, 'es')
    await expect(page.getByRole('link', { name: '> Empezar' })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('link', { name: '> Empezar' })).toBeVisible()
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === LANG_COOKIE)?.value).toBe('es')
  })
})
