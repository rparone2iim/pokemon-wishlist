import { effectScope } from 'vue'
import type { Ref } from 'vue'
import type { Pokemon, WishlistItem } from '~/types/pokemon'
import { loadWishlist, saveWishlist } from '~/utils/storage'
import type { AddResult } from '~/utils/wishlist'
import {
  addPokemon,
  isInWishlist,
  isWishlistFull,
  removePokemon,
  renamePokemon,
} from '~/utils/wishlist'
import type { Api } from '~/utils/api'

/** `loading` : 1er chargement · `ready` : synchro avec l'API · `offline` : API injoignable. */
export type WishlistStatus = 'loading' | 'ready' | 'offline'

export interface UseWishlist {
  wishlist: Ref<WishlistItem[]>
  status: Ref<WishlistStatus>
  isFull: ComputedRef<boolean>
  has: (id: number) => boolean
  add: (pokemon: Pokemon) => Promise<AddResult>
  remove: (id: number) => Promise<boolean>
  rename: (id: number, nickname: string) => Promise<boolean>
  clear: () => Promise<boolean>
  refresh: () => Promise<void>
}

interface WishlistState {
  api: Api
  wishlist: Ref<WishlistItem[]>
  status: Ref<WishlistStatus>
  refresh: () => Promise<void>
  /** Se résout quand le premier chargement depuis l'API est terminé. */
  loaded: Promise<void>
}

// Une seule wishlist partagée par toute l'appli.
let state: WishlistState | undefined

function wishlistState(): WishlistState {
  if (state) return state

  const api = useApi()
  const storage = import.meta.client ? window.localStorage : undefined
  // Le localStorage sert de cache : la dernière liste connue s'affiche tout de suite
  const wishlist = ref<WishlistItem[]>(storage ? loadWishlist(storage) : [])
  const status = ref<WishlistStatus>('loading')
  if (storage)
    // Scope détaché : la sauvegarde continue même quand on quitte la page
    // qui a créé la wishlist (sinon le watch s'arrête avec elle).
    effectScope(true).run(() => {
      watch(wishlist, (list) => saveWishlist(storage, list), { deep: true })
    })

  // L'API Hono est la source de vérité
  async function refresh(): Promise<void> {
    try {
      wishlist.value = await api.list()
      status.value = 'ready'
    } catch {
      status.value = 'offline'
    }
  }
  const loaded = import.meta.client ? refresh() : Promise.resolve()

  state = { api, wishlist, status, refresh, loaded }
  return state
}

export function useWishlist(): UseWishlist {
  const { api, wishlist, status, refresh, loaded } = wishlistState()
  const isFull = computed(() => isWishlistFull(wishlist.value))

  /** Remplace un Pokémon de la liste par la version renvoyée par l'API. */
  function replace(item: WishlistItem): void {
    wishlist.value = wishlist.value.map((p) => (p.id === item.id ? item : p))
  }

  /**
   * Applique le changement tout de suite à l'écran, puis l'envoie à l'API.
   * Si l'API refuse ou ne répond pas, on revient à la liste d'avant.
   */
  async function optimistic(
    next: () => WishlistItem[],
    send: () => Promise<boolean>,
  ): Promise<boolean> {
    // On attend le 1er chargement : sinon sa réponse, arrivée en retard,
    // pourrait écraser le changement qu'on vient de faire.
    await loaded
    const before = wishlist.value
    wishlist.value = next()
    try {
      if (await send()) {
        status.value = 'ready'
        return true
      }
      await refresh()
    } catch {
      wishlist.value = before
      status.value = 'offline'
    }
    return false
  }

  async function add(pokemon: Pokemon): Promise<AddResult> {
    await loaded
    const local = addPokemon(wishlist.value, pokemon)
    if (!local.ok) return local

    let refused: AddResult | undefined
    const saved = await optimistic(
      () => local.list,
      async () => {
        const res = await api.add(pokemon)
        if (res.ok) replace(res.item)
        else refused = { ok: false, error: res.error, list: wishlist.value }
        return res.ok
      },
    )
    if (saved) return { ok: true, list: wishlist.value }
    return refused ?? { ok: false, error: 'network', list: wishlist.value }
  }

  return {
    wishlist,
    status,
    isFull,
    has: (id) => isInWishlist(wishlist.value, id),
    add,
    remove: (id) =>
      optimistic(
        () => removePokemon(wishlist.value, id),
        () => api.remove(id),
      ),
    rename: (id, nickname) =>
      optimistic(
        () => renamePokemon(wishlist.value, id, nickname),
        async () => {
          const item = await api.rename(id, nickname)
          if (item) replace(item)
          return item !== null
        },
      ),
    clear: () =>
      optimistic(
        () => [],
        async () => {
          await api.clear()
          return true
        },
      ),
    refresh,
  }
}
