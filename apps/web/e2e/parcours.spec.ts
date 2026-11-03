import type { APIRequestContext, Page } from '@playwright/test'
import { POKEDEX, expect, test } from './fixtures'

// Parcours réel : le front et le back sont démarrés par Playwright
// (voir webServer dans playwright.config.ts), tout se fait en cliquant.

const search = (page: Page) =>
  page.getByRole('searchbox', { name: 'Rechercher un Pokémon' })
const results = (page: Page) =>
  page.getByRole('region', { name: /Recherche/ }).getByRole('listitem')
const cards = (page: Page) =>
  page.getByRole('region', { name: /Ma wishlist/ }).getByRole('listitem')
const toast = (page: Page) => page.locator('[aria-live] p')

/** Les noms présents dans la wishlist côté API. */
async function apiNames(request: APIRequestContext, api: string) {
  const list = (await (await request.get(`${api}/wishlist`)).json()) as {
    name: string
  }[]
  return list.map((p) => p.name)
}

async function addFromUi(page: Page, name: string) {
  await search(page).fill(name)
  await results(page)
    .first()
    .getByRole('button', { name: /Ajouter/ })
    .click()
  await expect(toast(page)).toContainText(/rejoint la wishlist/i)
}

test('parcours complet : ajout, doublon, limite de 6 et suppression', async ({
  page,
  request,
  api,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Commencer/ }).click()
  await expect(page.getByText('0/6')).toBeVisible()

  // 1. Ajout
  await addFromUi(page, 'pikachu')
  await expect(cards(page)).toHaveCount(1)
  expect(await apiNames(request, api)).toEqual(['pikachu'])

  // 2. Doublon : impossible d'ajouter deux fois le même Pokémon
  await search(page).fill('pikachu')
  await expect(
    results(page)
      .first()
      .getByRole('button', { name: /Dans la liste/ }),
  ).toBeDisabled()
  expect(await apiNames(request, api)).toEqual(['pikachu'])

  // 3. Limite de 6 : on remplit l'équipe, le 7e est refusé
  const others = POKEDEX.filter((p) => p.name !== 'pikachu')
  for (const pokemon of others.slice(0, 5)) {
    await addFromUi(page, pokemon.name)
  }
  await expect(page.getByText('6/6')).toBeVisible()
  await expect(cards(page)).toHaveCount(6)

  const seventh = others[5]!.name
  await search(page).fill(seventh)
  await expect(
    results(page)
      .first()
      .getByRole('button', { name: /Liste pleine/ }),
  ).toBeDisabled()
  expect(await apiNames(request, api)).toHaveLength(6)
  expect(await apiNames(request, api)).not.toContain(seventh)

  // 4. Suppression : on retire Pikachu, une place se libère
  await cards(page)
    .filter({ hasText: /pikachu/i })
    .getByRole('button', { name: /Retirer/ })
    .click()
  await expect(toast(page)).toContainText(/quitte la wishlist/i)
  await expect(page.getByText('5/6')).toBeVisible()
  expect(await apiNames(request, api)).not.toContain('pikachu')

  // …et le 7e Pokémon peut maintenant être ajouté
  await addFromUi(page, seventh)
  await expect(page.getByText('6/6')).toBeVisible()
  expect(await apiNames(request, api)).toContain(seventh)

  // Tout est bien enregistré côté API : la page rechargée affiche la même chose
  await page.reload()
  await expect(cards(page)).toHaveCount(6)
  await expect(cards(page).filter({ hasText: /pikachu/i })).toHaveCount(0)
})

test('doublon refusé par l’API (409) si le Pokémon a été ajouté ailleurs entre-temps', async ({
  page,
  request,
  api,
}) => {
  // La page a fini de charger la wishlist (vide) depuis l'API…
  const firstLoad = page.waitForResponse(
    (res) =>
      res.url() === `${api}/wishlist` && res.request().method() === 'GET',
  )
  await page.goto('/wishlist')
  await firstLoad
  await expect(page.getByText('0/6')).toBeVisible()

  // …puis un autre client (autre onglet, autre appareil…) ajoute Pikachu via l'API
  await request.post(`${api}/wishlist`, { data: { id: 25, name: 'pikachu' } })

  // La page n'est pas à jour : on tente d'ajouter Pikachu à notre tour
  await search(page).fill('pikachu')
  await results(page)
    .first()
    .getByRole('button', { name: /Ajouter/ })
    .click()

  // C'est le message de l'API (409), traduit par elle dans la langue choisie
  await expect(toast(page)).toContainText(
    'Ce Pokémon est déjà dans la wishlist',
  )
  // Une seule fois dans la liste, comme dans l'API
  await expect(cards(page)).toHaveCount(1)
  expect(await apiNames(request, api)).toEqual(['pikachu'])
})
