import { Hono } from 'hono'
import type { AppEnv } from '../i18n.js'
import { t } from '../i18n.js'
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

/** Identifiant de route valide (entier > 0), sinon null. */
function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function wishlistRoutes(store: WishlistStore) {
  const routes = new Hono<AppEnv>()

  // GET /wishlist → 200 et la liste
  routes.get('/', async (c) => c.json(await store.list(), 200))

  // POST /wishlist → 201 et le Pokémon ajouté
  routes.post('/', async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    const pokemon = parsePokemon(body)
    if (!pokemon) return c.json<ApiError>({ error: t(c, 'invalidBody') }, 400)

    const result = await store.add(pokemon)
    if (!result.ok)
      return c.json<ApiError>(
        {
          error:
            result.error === 'duplicate'
              ? t(c, 'duplicate')
              : t(c, 'full', { max: MAX_WISHLIST }),
          code: result.error,
        },
        409,
      )

    c.header('Location', `/wishlist/${result.item.id}`)
    return c.json(result.item, 201)
  })

  // DELETE /wishlist → 204, vide toute la wishlist
  routes.delete('/', async (c) => {
    await store.clear()
    return c.body(null, 204)
  })

  // PATCH /wishlist/:id { nickname } → 200 et le Pokémon renommé
  routes.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    if (!id) return c.json<ApiError>({ error: t(c, 'invalidId') }, 400)

    const body: unknown = await c.req.json().catch(() => null)
    const nickname =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).nickname
        : undefined
    if (typeof nickname !== 'string')
      return c.json<ApiError>({ error: t(c, 'invalidNicknameBody') }, 400)

    const renamed = await store.rename(id, nickname)
    if (!renamed) return c.json<ApiError>({ error: t(c, 'notInWishlist') }, 404)
    return c.json(renamed, 200)
  })

  // POST /wishlist/:id/like → 200 et le Pokémon avec un like de plus
  // DELETE /wishlist/:id/like → 200 et un like de moins (jamais sous 0)
  for (const [method, action] of [
    ['post', 'like'],
    ['delete', 'unlike'],
  ] as const) {
    routes[method]('/:id/like', async (c) => {
      const id = parseId(c.req.param('id'))
      if (!id) return c.json<ApiError>({ error: t(c, 'invalidId') }, 400)
      const item = await store[action](id)
      if (!item) return c.json<ApiError>({ error: t(c, 'notInWishlist') }, 404)
      return c.json(item, 200)
    })
  }

  // DELETE /wishlist/:id → 200 et le Pokémon retiré, 404 s'il n'y est pas
  routes.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    if (!id) return c.json<ApiError>({ error: t(c, 'invalidId') }, 400)

    const removed = await store.remove(id)
    if (!removed) return c.json<ApiError>({ error: t(c, 'notInWishlist') }, 404)
    return c.json(removed, 200)
  })

  return routes
}
