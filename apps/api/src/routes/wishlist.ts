import { Hono } from 'hono'
import type { WishlistStore } from '../store.js'
import { MAX_WISHLIST } from '../store.js'
import type { ApiError, Pokemon } from '../types.js'

/** Vérifie le corps de POST /wishlist : { id: entier > 0, name: texte non vide }. */
export function parsePokemon(body: unknown): Pokemon | null {
  if (typeof body !== 'object' || body === null) return null
  const { id, name } = body as Record<string, unknown>
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null
  if (typeof name !== 'string' || !name.trim()) return null
  return { id, name: name.trim().toLowerCase() }
}

export function wishlistRoutes(store: WishlistStore) {
  const routes = new Hono()

  // GET /wishlist → 200 et la liste
  routes.get('/', (c) => c.json(store.list(), 200))

  // POST /wishlist → 201 et le Pokémon ajouté
  routes.post('/', async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    const pokemon = parsePokemon(body)
    if (!pokemon)
      return c.json<ApiError>(
        { error: 'Corps attendu : { "id": number, "name": string }' },
        400,
      )

    console.log('POST /wishlist', pokemon)
    const result = store.add(pokemon)
    if (!result.ok)
      return c.json<ApiError>(
        {
          error:
            result.error === 'duplicate'
              ? 'Ce Pokémon est déjà dans la wishlist'
              : `La wishlist est pleine (${MAX_WISHLIST} max)`,
        },
        409,
      )

    c.header('Location', `/wishlist/${result.item.id}`)
    return c.json(result.item, 201)
  })

  // DELETE /wishlist/:id → 200 et le Pokémon retiré, 404 s'il n'y est pas
  routes.delete('/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0)
      return c.json<ApiError>({ error: 'Identifiant invalide' }, 400)

    const removed = store.remove(id)
    if (!removed)
      return c.json<ApiError>(
        { error: "Ce Pokémon n'est pas dans la wishlist" },
        404,
      )
    return c.json(removed, 200)
  })

  return routes
}
