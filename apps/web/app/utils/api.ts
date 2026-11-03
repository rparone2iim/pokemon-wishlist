import type { Pokemon, PokemonDetails, WishlistItem } from '../types/pokemon'

/** Erreur quand l'API répond un statut inattendu (ou est injoignable). */
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`L'API a répondu ${status}`)
    this.name = 'ApiError'
  }
}

export type ApiAddResult =
  | { ok: true; item: WishlistItem }
  | {
      ok: false
      error: 'duplicate' | 'full'
      /** Message de l'API, traduit dans la langue envoyée. */
      message: string
    }

/** Résultat de GET /pokemon/:nom : la fiche, ou le message d'erreur de l'API. */
export type PokemonLookup =
  | { ok: true; pokemon: PokemonDetails }
  | { ok: false; status: 400 | 404; message: string }

export interface Api {
  /** GET /pokemon : tous les Pokémon (l'API les demande à PokéAPI). */
  listPokemon: () => Promise<Pokemon[]>
  /** GET /pokemon/:nom : la fiche, ou l'erreur si le Pokémon n'existe pas (404) ou si le nom est invalide (400). */
  getPokemon: (nameOrId: string) => Promise<PokemonLookup>
  list: () => Promise<WishlistItem[]>
  add: (pokemon: Pokemon) => Promise<ApiAddResult>
  /** `false` si le Pokémon n'était pas dans la wishlist (404). */
  remove: (id: number) => Promise<boolean>
  /** `null` si le Pokémon n'est pas dans la wishlist (404). */
  rename: (id: number, nickname: string) => Promise<WishlistItem | null>
  clear: () => Promise<void>
}

/** Message d'erreur renvoyé par l'API ({ error }), ou un texte de secours. */
async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: string
  } | null
  return body?.error ?? `HTTP ${res.status}`
}

/**
 * Client de l'API Hono (apps/api). Le front ne parle qu'à elle :
 * c'est l'API qui interroge PokéAPI et qui garde la wishlist.
 * Chaque requête envoie la langue de l'appli (Accept-Language) : l'API
 * répond avec ses messages d'erreur et ses fiches dans cette langue.
 */
export function createApi(
  baseUrl: string,
  language: () => string = () => 'en',
): Api {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

  function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('Accept-Language', language())
    return fetch(url(path), { ...init, headers })
  }

  function sendJson(path: string, method: string, body: unknown) {
    return request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function expect(response: Response, ...ok: number[]) {
    if (!ok.includes(response.status)) throw new ApiError(response.status)
    return response
  }

  return {
    async listPokemon() {
      const res = await expect(await request('/pokemon'), 200)
      return (await res.json()) as Pokemon[]
    },

    async getPokemon(nameOrId) {
      const key = encodeURIComponent(nameOrId.trim().toLowerCase())
      const res = await expect(await request(`/pokemon/${key}`), 200, 404, 400)
      if (res.status === 200)
        return { ok: true, pokemon: (await res.json()) as PokemonDetails }
      return {
        ok: false,
        status: res.status as 400 | 404,
        message: await errorMessage(res),
      }
    },

    async list() {
      const res = await expect(await request('/wishlist'), 200)
      return (await res.json()) as WishlistItem[]
    },

    async add(pokemon) {
      const res = await expect(
        await sendJson('/wishlist', 'POST', {
          id: pokemon.id,
          name: pokemon.name,
        }),
        201,
        409,
      )
      if (res.status === 201)
        return { ok: true, item: (await res.json()) as WishlistItem }
      const body = (await res.json()) as { code?: string; error?: string }
      return {
        ok: false,
        error: body.code === 'full' ? 'full' : 'duplicate',
        message: body.error ?? '',
      }
    },

    async remove(id) {
      const res = await expect(
        await request(`/wishlist/${id}`, { method: 'DELETE' }),
        200,
        404,
      )
      return res.status === 200
    },

    async rename(id, nickname) {
      const res = await expect(
        await sendJson(`/wishlist/${id}`, 'PATCH', { nickname }),
        200,
        404,
      )
      return res.status === 200 ? ((await res.json()) as WishlistItem) : null
    },

    async clear() {
      await expect(await request('/wishlist', { method: 'DELETE' }), 204)
    },
  }
}
