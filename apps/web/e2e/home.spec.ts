import { expect, test } from './fixtures'

test.describe('page d’accueil', () => {
  test('affiche le jardin avec des Pokémon qui se baladent', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'PokéWishlist' }),
    ).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()

    const walker = page.locator('canvas ~ div').first()
    await expect(walker).toBeAttached()
    const start = await walker.evaluate((el) => (el as HTMLElement).style.left)
    // Au moins un Pokémon a bougé au bout de quelques secondes
    await expect
      .poll(() =>
        page
          .locator('canvas ~ div')
          .evaluateAll((els) =>
            els.map((el) => (el as HTMLElement).style.left),
          ),
      )
      .not.toContain(start)
  })

  test('le bouton Commencer mène à la wishlist', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Commencer/ }).click()

    await expect(page).toHaveURL(/\/wishlist$/)
    await expect(
      page.getByRole('searchbox', { name: 'Rechercher un Pokémon' }),
    ).toBeVisible()
  })
})
