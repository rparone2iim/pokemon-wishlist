import type { APIRequestContext, Page } from '@playwright/test'
import { LANG_COOKIE, apiResponse, expect, test } from './fixtures'

// Les fonctionnalités ajoutées pendant le CD, testées du navigateur jusqu'à
// l'API (et sa base PostgreSQL) : fiche, langues, persistance et likes.

const cards = (page: Page) =>
  page
    .getByRole('region', { name: /Ma wishlist|My wishlist/ })
    .getByRole('listitem')
const likeButton = (page: Page, name: string) =>
  cards(page).getByRole('button', { name: new RegExp(`(Aimer|Like) ${name} `) })

/** Les likes enregistrés par l'API, Pokémon par Pokémon. */
async function apiLikes(request: APIRequestContext, api: string) {
  const list = (await (await request.get(`${api}/wishlist`)).json()) as {
    name: string
    likes: number
  }[]
  return Object.fromEntries(list.map((p) => [p.name, p.likes]))
}

/** Clique sur ♥ et attend que l'API ait enregistré le like. */
async function like(page: Page, id: number, name: string) {
  const saved = apiResponse(page, 'POST', `/wishlist/${id}/like`)
  await likeButton(page, name).click()
  expect((await saved).status()).toBe(200)
}

test.describe('likes', () => {
  test('un Pokémon ajouté commence à 0 like', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')

    await expect(likeButton(page, 'pikachu')).toHaveAccessibleName(
      'Aimer pikachu (0 likes)',
    )
    expect(await apiLikes(request, api)).toEqual({ pikachu: 0 })
  })

  test('♥ ajoute un like, enregistré par l’API, et seulement sur ce Pokémon', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await request.post(`${api}/wishlist`, { data: { id: 133, name: 'eevee' } })
    await page.goto('/wishlist')

    await like(page, 25, 'pikachu')
    await like(page, 25, 'pikachu')
    await like(page, 133, 'eevee')

    await expect(likeButton(page, 'pikachu')).toContainText('2')
    await expect(likeButton(page, 'eevee')).toContainText('1')
    expect(await apiLikes(request, api)).toEqual({ pikachu: 2, eevee: 1 })
  })

  test('les likes restent après un rechargement (ils viennent de la base)', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')
    await like(page, 25, 'pikachu')
    await like(page, 25, 'pikachu')
    await like(page, 25, 'pikachu')

    await page.reload()

    await expect(likeButton(page, 'pikachu')).toHaveAccessibleName(
      'Aimer pikachu (3 likes)',
    )
  })

  test('les likes d’un autre client s’affichent au chargement', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    // Un autre appareil a déjà aimé Pikachu deux fois
    for (let i = 0; i < 2; i++)
      expect((await request.post(`${api}/wishlist/25/like`)).status()).toBe(200)

    await page.goto('/wishlist')

    await expect(likeButton(page, 'pikachu')).toContainText('2')
  })

  test('retirer puis remettre un Pokémon remet ses likes à 0', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')
    await like(page, 25, 'pikachu')

    const removed = apiResponse(page, 'DELETE', '/wishlist/25')
    await cards(page)
      .getByRole('button', { name: /Retirer/ })
      .click()
    expect((await removed).status()).toBe(200)
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.reload()

    await expect(likeButton(page, 'pikachu')).toContainText('0')
    expect(await apiLikes(request, api)).toEqual({ pikachu: 0 })
  })
})

test.describe('parcours étendu', () => {
  // L'appli choisit seule sa langue : anglais par défaut
  test.use({ lang: null })

  test('fiche → wishlist → like → langue → rechargement : tout est gardé', async ({
    page,
    request,
    api,
  }) => {
    // 1. Fiche : une URL directe, rendue en anglais par défaut
    await page.goto('/pokemon/pikachu')
    const fiche = page.getByRole('article')
    await expect(
      fiche.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()

    // 2. Ajout à la wishlist depuis la fiche
    const saved = apiResponse(page, 'POST', '/wishlist')
    await fiche.getByRole('button', { name: /Add to wishlist/ }).click()
    expect((await saved).status()).toBe(201)

    // 3. Langue : on passe en français, puis on va sur la wishlist
    await page
      .getByRole('group', { name: /Language/ })
      .getByRole('button', { name: 'fr', exact: true })
      .click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await page.goto('/wishlist')
    await expect(page).toHaveTitle('Ma wishlist · PokéWishlist')

    // 4. Like
    await like(page, 25, 'pikachu')
    await expect(likeButton(page, 'pikachu')).toHaveAccessibleName(
      'Aimer pikachu (1 likes)',
    )

    // 5. Rechargement : la langue (cookie), la wishlist et le like (base) restent
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(cards(page)).toHaveCount(1)
    await expect(likeButton(page, 'pikachu')).toHaveAccessibleName(
      'Aimer pikachu (1 likes)',
    )
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === LANG_COOKIE)?.value).toBe('fr')
    expect(await apiLikes(request, api)).toEqual({ pikachu: 1 })
  })
})
