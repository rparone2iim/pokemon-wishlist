import type { Pokemon, PokemonDetails, WishlistItem } from '../types/pokemon'

/** Erreur quand l'API répond un statut inattendu (ou est injoignable). */
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`L'API a répondu ${status}`)
    this.name = 'ApiError'
  }
}

export type ApiAddResult =
  { ok: true; item: WishlistItem } | { ok: false; error: 'duplicate' | 'full' }

export interface Api {
  /** GET /pokemon : tous les Pokémon (l'API les demande à PokéAPI). */
  listPokemon: () => Promise<Pokemon[]>
  /** GET /pokemon/:nom : la fiche, `null` si le Pokémon n'existe pas (404) ou si le nom est invalide (400). */
  getPokemon: (nameOrId: string) => Promise<PokemonDetails | null>
  list: () => Promise<WishlistItem[]>
  add: (pokemon: Pokemon) => Promise<ApiAddResult>
  /** `false` si le Pokémon n'était pas dans la wishlist (404). */
  remove: (id: number) => Promise<boolean>
  /** `null` si le Pokémon n'est pas dans la wishlist (404). */
  rename: (id: number, nickname: string) => Promise<WishlistItem | null>
  clear: () => Promise<void>
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * Client de l'API Hono (apps/api). Le front ne parle qu'à elle :
 * c'est l'API qui interroge PokéAPI et qui garde la wishlist.
 */
export function createApi(baseUrl: string): Api {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

  async function expect(response: Response, ...ok: number[]) {
    if (!ok.includes(response.status)) throw new ApiError(response.status)
    return response
  }

  return {
    async listPokemon() {
      const res = await expect(await fetch(url('/pokemon')), 200)
      return (await res.json()) as Pokemon[]
    },

    async getPokemon(nameOrId) {
      const key = encodeURIComponent(nameOrId.trim().toLowerCase())
      const res = await expect(
        await fetch(url(`/pokemon/${key}`)),
        200,
        404,
        400,
      )
      return res.status === 200 ? ((await res.json()) as PokemonDetails) : null
    },

    async list() {
      const res = await expect(await fetch(url('/wishlist')), 200)
      return (await res.json()) as WishlistItem[]
    },

    async add(pokemon) {
      const res = await expect(
        await fetch(url('/wishlist'), {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ id: pokemon.id, name: pokemon.name }),
        }),
        201,
        409,
      )
      if (res.status === 201)
        return { ok: true, item: (await res.json()) as WishlistItem }
      const body = (await res.json()) as { code?: string }
      return { ok: false, error: body.code === 'full' ? 'full' : 'duplicate' }
    },

    async remove(id) {
      const res = await expect(
        await fetch(url(`/wishlist/${id}`), { method: 'DELETE' }),
        200,
        404,
      )
      return res.status === 200
    },

    async rename(id, nickname) {
      const res = await expect(
        await fetch(url(`/wishlist/${id}`), {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify({ nickname }),
        }),
        200,
        404,
      )
      return res.status === 200 ? ((await res.json()) as WishlistItem) : null
    },

    async clear() {
      await expect(await fetch(url('/wishlist'), { method: 'DELETE' }), 204)
    },
  }
}
