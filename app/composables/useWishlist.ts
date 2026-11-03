import { effectScope } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Pokemon, WishlistItem } from '~/types/pokemon'
import { STORAGE_KEY, loadWishlist, saveWishlist } from '~/utils/storage'
import type { AddResult } from '~/utils/wishlist'
import {
  addPokemon,
  isInWishlist,
  isWishlistFull,
  removePokemon,
  renamePokemon,
} from '~/utils/wishlist'

export interface UseWishlist {
  wishlist: Ref<WishlistItem[]>
  isFull: ComputedRef<boolean>
  has: (id: number) => boolean
  add: (pokemon: Pokemon) => AddResult
  remove: (id: number) => void
  rename: (id: number, nickname: string) => void
  clear: () => void
}

// Une seule wishlist partagée par toute l'appli, synchronisée avec localStorage.
let state: Ref<WishlistItem[]> | undefined

function wishlistState(): Ref<WishlistItem[]> {
  if (state) return state
  const storage = import.meta.client ? window.localStorage : undefined
  const list = ref<WishlistItem[]>(storage ? loadWishlist(storage) : [])
  state = list
  if (storage) {
    // Scope détaché : la sauvegarde continue même quand on quitte la page
    // qui a créé la wishlist (sinon le watch s'arrête avec elle).
    effectScope(true).run(() => {
      watch(list, (items) => saveWishlist(storage, items), { deep: true })
    })
    // Garde les onglets ouverts à jour entre eux
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) list.value = loadWishlist(storage)
    })
  }
  return list
}

export function useWishlist(): UseWishlist {
  const wishlist = wishlistState()
  const isFull = computed(() => isWishlistFull(wishlist.value))

  function add(pokemon: Pokemon): AddResult {
    const result = addPokemon(wishlist.value, pokemon)
    if (result.ok) wishlist.value = result.list
    return result
  }

  return {
    wishlist,
    isFull,
    has: (id) => isInWishlist(wishlist.value, id),
    add,
    remove: (id) => {
      wishlist.value = removePokemon(wishlist.value, id)
    },
    rename: (id, nickname) => {
      wishlist.value = renamePokemon(wishlist.value, id, nickname)
    },
    clear: () => {
      wishlist.value = []
    },
  }
}
