import type { Page } from '@playwright/test'
import { CACHE_KEY, POKEDEX, apiResponse, expect, test } from './fixtures'

const search = (page: Page) =>
  page.getByRole('searchbox', { name: 'Rechercher un Pokémon' })
const results = (page: Page) =>
  page.getByRole('region', { name: /Recherche/ }).getByRole('listitem')
const cards = (page: Page) =>
  page.getByRole('region', { name: /Ma wishlist/ }).getByRole('listitem')

async function addFromSearch(page: Page, query: string) {
  await search(page).fill(query)
  await results(page)
    .first()
    .getByRole('button', { name: /Ajouter/ })
    .click()
}

test.describe('wishlist branchée sur l’API Hono (qui interroge PokéAPI)', () => {
  test('ajoute un Pokémon depuis la recherche', async ({
    page,
    request,
    api,
  }) => {
    await page.goto('/wishlist')
    const saved = apiResponse(page, 'POST', '/wishlist')
    await addFromSearch(page, 'pika')

    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(/pikachu/i)
    await expect(page.getByText('1/6')).toBeVisible()
    await expect(
      results(page)
        .first()
        .getByRole('button', { name: /Dans la liste/ }),
    ).toBeDisabled()

    // L'API a bien enregistré l'ajout
    expect((await saved).status()).toBe(201)
    const list = await (await request.get(`${api}/wishlist`)).json()
    expect(list).toMatchObject([{ id: 25, name: 'pikachu' }])
  })

  test('la wishlist reste après un rechargement (elle vient de l’API)', async ({
    page,
  }) => {
    await page.goto('/wishlist')
    const saved = apiResponse(page, 'POST', '/wishlist')
    await addFromSearch(page, 'pika')
    await expect(cards(page)).toHaveCount(1)
    // On ne recharge qu'une fois l'ajout enregistré par l'API
    expect((await saved).status()).toBe(201)

    await page.reload()

    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(/pikachu/i)
  })

  test('renomme un Pokémon et garde son vrai nom en dessous', async ({
    page,
    request,
    api,
  }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')

    const card = cards(page).first()
    await card.getByRole('button', { name: 'Renommer' }).click()
    await card.getByRole('textbox', { name: /Surnom/ }).fill('Sparky')
    const saved = apiResponse(page, 'PATCH', '/wishlist/25')
    await card.getByRole('textbox', { name: /Surnom/ }).press('Enter')

    await expect(card.getByRole('heading')).toHaveText(/sparky/i)
    await expect(card).toContainText(/pikachu/i)

    expect((await saved).status()).toBe(200)
    const [item] = await (await request.get(`${api}/wishlist`)).json()
    expect(item).toMatchObject({ id: 25, nickname: 'Sparky' })

    await page.reload()
    await expect(cards(page).first().getByRole('heading')).toHaveText(/sparky/i)
  })

  test('retire un Pokémon', async ({ page, request, api }) => {
    await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })
    await page.goto('/wishlist')

    const saved = apiResponse(page, 'DELETE', '/wishlist/25')
    await cards(page)
      .first()
      .getByRole('button', { name: /Retirer/ })
      .click()

    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText('Ta wishlist est vide')).toBeVisible()
    expect((await saved).status()).toBe(200)
    expect(await (await request.get(`${api}/wishlist`)).json()).toEqual([])
  })

  test('bloque l’ajout au-delà de 6 Pokémon', async ({
    page,
    request,
    api,
  }) => {
    for (const pokemon of POKEDEX.slice(0, 6)) {
      await request.post(`${api}/wishlist`, { data: pokemon })
    }
    await page.goto('/wishlist')

    await expect(page.getByText('6/6')).toBeVisible()
    await search(page).fill('eevee')
    await expect(
      results(page)
        .first()
        .getByRole('button', { name: /Liste pleine/ }),
    ).toBeDisabled()
  })

  test('cherche les Pokémon via l’API (et pas directement PokéAPI)', async ({
    page,
    api,
  }) => {
    const calls: string[] = []
    page.on('request', (req) => calls.push(req.url()))

    await page.goto('/wishlist')
    await search(page).fill('char')
    await expect(results(page)).toHaveCount(1)
    await expect(results(page).first()).toContainText(/charmander/i)

    expect(calls).toContain(`${api}/pokemon`)
    expect(calls.some((url) => url.includes('pokeapi.co'))).toBe(false)
  })

  test('signale un Pokémon introuvable sur PokéAPI (404)', async ({ page }) => {
    await page.goto('/wishlist')
    await search(page).fill('pikachoux')
    await search(page).press('Enter')

    await expect(
      page.getByText('« pikachoux » est introuvable sur PokéAPI (404).'),
    ).toBeVisible()
  })

  test('prévient quand l’API ne répond pas', async ({ page, api }) => {
    await page.route(`${api}/**`, (route) => route.abort())
    await page.goto('/wishlist')

    await expect(page.getByRole('alert')).toContainText("L'API ne répond pas")
  })
})

test.describe('cache localStorage', () => {
  test('sauvegarde la wishlist dans le localStorage', async ({ page }) => {
    await page.goto('/wishlist')
    await addFromSearch(page, 'pika')
    await expect(cards(page)).toHaveCount(1)

    const saved = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
      CACHE_KEY,
    )
    expect(saved).toMatchObject([{ id: 25, name: 'pikachu' }])
  })

  test('continue de sauvegarder après être passé par l’accueil', async ({
    page,
  }) => {
    // La wishlist est créée par la page d'accueil : la sauvegarde ne doit
    // pas s'arrêter quand on quitte cette page.
    await page.goto('/')
    await page.getByRole('link', { name: /Commencer/ }).click()
    await addFromSearch(page, 'pika')
    await expect(cards(page)).toHaveCount(1)

    const saved = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
      CACHE_KEY,
    )
    expect(saved).toMatchObject([{ id: 25, name: 'pikachu' }])
  })

  test.describe('lecture du cache', () => {
    test.use({
      cache: JSON.stringify([
        { id: 25, name: 'pikachu', addedAt: '', nickname: 'Sparky' },
      ]),
    })

    test('affiche la dernière liste connue si l’API ne répond pas', async ({
      page,
      api,
    }) => {
      await page.route(`${api}/**`, (route) => route.abort())
      await page.goto('/wishlist')

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(cards(page)).toHaveCount(1)
      await expect(cards(page).first().getByRole('heading')).toHaveText(
        /sparky/i,
      )
    })

    test('l’API reste la source de vérité quand elle répond', async ({
      page,
    }) => {
      await page.goto('/wishlist')

      // L'API est vide : le cache est remplacé par sa réponse
      await expect(page.getByText('Ta wishlist est vide')).toBeVisible()
      await expect(cards(page)).toHaveCount(0)
    })
  })

  test('stockage vide : la page s’affiche normalement', async ({ page }) => {
    await page.goto('/wishlist')

    await expect(page.getByText('0/6')).toBeVisible()
    await expect(page.getByText('Ta wishlist est vide')).toBeVisible()
  })

  test.describe('JSON corrompu', () => {
    test.use({ cache: '{pas du json' })

    test('ne fait pas planter l’application', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))

      await page.goto('/')
      await expect(page.getByRole('link', { name: /Commencer/ })).toBeVisible()
      // Chargement terminé avant de changer de page : sinon WebKit signale les
      // requêtes internes de Nuxt annulées par la navigation (rien à voir avec le JSON)
      await page.waitForLoadState('networkidle')
      await page.goto('/wishlist')
      await expect(page.getByText('0/6')).toBeVisible()
      await addFromSearch(page, 'pika')
      await expect(cards(page)).toHaveCount(1)

      expect(errors).toEqual([])
    })
  })
})
