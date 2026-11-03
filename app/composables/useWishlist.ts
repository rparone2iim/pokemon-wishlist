import { effectScope } from 'vue'
import { STORAGE_KEY, loadWishlist, saveWishlist } from '~/utils/storage'
import {
  addPokemon,
  isInWishlist,
  isWishlistFull,
  removePokemon,
  renamePokemon,
} from '~/utils/wishlist'

// Une seule wishlist partagée par toute l'appli, synchronisée avec localStorage.
let state

function wishlistState() {
  if (state) return state
  const storage = import.meta.client ? window.localStorage : undefined
  state = ref(storage ? loadWishlist(storage) : [])
  if (storage) {
    // Scope détaché : la sauvegarde continue même quand on quitte la page
    // qui a créé la wishlist (sinon le watch s'arrête avec elle).
    effectScope(true).run(() => {
      watch(state, (list) => saveWishlist(storage, list), { deep: true })
    })
    // Garde les onglets ouverts à jour entre eux
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && state)
        state.value = loadWishlist(storage)
    })
  }
  return state
}

export function useWishlist() {
  const wishlist = wishlistState()
  const isFull = computed(() => isWishlistFull(wishlist.value))

  function add(pokemon) {
    console.log('ajout', pokemon.name)
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
