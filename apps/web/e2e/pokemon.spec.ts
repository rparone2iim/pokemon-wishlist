import type { Page } from '@playwright/test'
import { apiResponse, expect, test } from './fixtures'

// Fiche d'un Pokémon : /pokemon/[name], via l'API Hono (qui interroge PokéAPI)

const fiche = (page: Page) => page.getByRole('article')
const stat = (page: Page, label: string) =>
  page.getByRole('meter', { name: label })

test.describe('fiche Pokémon /pokemon/[name]', () => {
  test('une URL directe affiche le Pokémon et ses informations', async ({
    page,
  }) => {
    await page.goto('/pokemon/pikachu')

    await expect(
      fiche(page).getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
    await expect(page).toHaveTitle('Pikachu · PokéWishlist')
    await expect(fiche(page)).toContainText('No.0025')
    await expect(fiche(page)).toContainText('Pokémon Test')
    await expect(fiche(page)).toContainText('Fiche de test de Pikachu.')
    await expect(page.getByRole('list', { name: 'Types' })).toHaveText(
      /Électrik/i,
    )
    await expect(fiche(page)).toContainText('0,4 m')
    await expect(fiche(page)).toContainText('6 kg')
    await expect(fiche(page)).toContainText(/static/i)
    await expect(fiche(page)).toContainText(/lightning rod \(caché\)/i)
    await expect(page.getByRole('meter')).toHaveCount(6)
    await expect(stat(page, 'PV')).toHaveAttribute('aria-valuenow', '35')
    await expect(stat(page, 'Vitesse')).toHaveAttribute('aria-valuenow', '90')
  })

  test('affiche le nom français et les deux types', async ({ page }) => {
    await page.goto('/pokemon/bulbasaur')

    await expect(
      fiche(page).getByRole('heading', { level: 1, name: 'Bulbizarre' }),
    ).toBeVisible()
    await expect(fiche(page)).toContainText(/bulbasaur/i)
    await expect(
      page.getByRole('list', { name: 'Types' }).getByRole('listitem'),
    ).toHaveText([/Plante/i, /Poison/i])
  })

  test('accepte un numéro ou des majuscules dans l’URL', async ({ page }) => {
    await page.goto('/pokemon/133')
    await expect(
      fiche(page).getByRole('heading', { level: 1, name: 'Évoli' }),
    ).toBeVisible()

    await page.goto('/pokemon/PIKACHU')
    await expect(
      fiche(page).getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
  })

  test('gère le cas 404 : Pokémon introuvable', async ({ page }) => {
    await page.goto('/pokemon/pikachoux')

    await expect(
      page.getByRole('heading', { name: /Pokémon inconnu/ }),
    ).toBeVisible()
    // Le message vient de l'API Hono (404), en français comme l'appli
    await expect(
      page.getByText(/Pokémon introuvable : « pikachoux » \(404\)/),
    ).toBeVisible()
    await expect(page).toHaveTitle('Pokémon inconnu · PokéWishlist')
    await expect(fiche(page)).toHaveCount(0)

    // On peut revenir à la wishlist
    await page.getByRole('link', { name: /Wishlist/ }).click()
    await expect(page).toHaveURL(/\/wishlist$/)
  })

  test('un nom invalide est traité comme introuvable', async ({ page }) => {
    await page.goto('/pokemon/pika%20chu!')

    await expect(
      page.getByRole('heading', { name: /Pokémon inconnu/ }),
    ).toBeVisible()
    await expect(page.getByText(/Nom ou numéro invalide/)).toBeVisible()
  })

  test('on ouvre la fiche depuis une carte de la wishlist', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')

    await page.getByRole('link', { name: 'Voir la fiche de pikachu' }).click()

    await expect(page).toHaveURL(/\/pokemon\/pikachu$/)
    await expect(
      fiche(page).getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
    // Il est déjà dans la wishlist
    await expect(
      fiche(page).getByRole('button', { name: 'Dans la liste' }),
    ).toBeDisabled()
  })

  test('ajoute le Pokémon à la wishlist depuis sa fiche', async ({
    page,
    request,
    api,
  }) => {
    await page.goto('/pokemon/eevee')
    const saved = apiResponse(page, 'POST', '/wishlist')

    await fiche(page)
      .getByRole('button', { name: /Ajouter à la wishlist/ })
      .click()

    expect((await saved).status()).toBe(201)
    await expect(
      fiche(page).getByRole('button', { name: 'Dans la liste' }),
    ).toBeDisabled()
    const list = await (await request.get(`${api}/wishlist`)).json()
    expect(list).toMatchObject([{ id: 133, name: 'eevee' }])
  })
})
