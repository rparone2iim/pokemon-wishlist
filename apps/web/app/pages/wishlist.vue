<script setup lang="ts">
import type { Pokemon, WishlistItem } from '~/types/pokemon'
import { MAX_WISHLIST, nicknameOf } from '~/utils/wishlist'

const { data: pokedex, status, error } = usePokedex()
const {
  wishlist,
  status: apiStatus,
  isFull,
  has,
  add,
  remove,
  rename,
  clear,
} = useWishlist()
const { show } = useToast()
const api = useApi()

useHead({ title: 'Ma wishlist · PokéWishlist' })

const query = ref('')

// Résultat demandé directement à PokéAPI (touche Entrée)
type RemoteStatus = 'idle' | 'loading' | 'notfound' | 'error'
const remote = ref<Pokemon | null>(null)
const remoteStatus = ref<RemoteStatus>('idle')
watch(query, () => {
  remote.value = null
  remoteStatus.value = 'idle'
})

const results = computed<Pokemon[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const local = (pokedex.value ?? [])
    .filter((p) => p.name.includes(q) || String(p.id) === q)
    .slice(0, 12)
  return local.length || !remote.value ? local : [remote.value]
})

async function onSubmit(): Promise<void> {
  const q = query.value.trim()
  if (!q || results.value.length) return
  remoteStatus.value = 'loading'
  try {
    const found = await api.getPokemon(q)
    remote.value = found
    remoteStatus.value = found ? 'idle' : 'notfound'
  } catch {
    remoteStatus.value = 'error'
  }
}

const OFFLINE = "L'API ne répond pas, réessaie plus tard."

async function onAdd(pokemon: Pokemon): Promise<void> {
  const result = await add(pokemon)
  if (result.ok) show(`${displayName(pokemon.name)} rejoint la wishlist !`)
  else if (result.error === 'duplicate')
    show(`${displayName(pokemon.name)} est déjà dans ta wishlist !`)
  else if (result.error === 'full')
    show(`Ta wishlist est pleine (${MAX_WISHLIST} max) !`)
  else if (result.error === 'network') show(OFFLINE)
}

async function onRemove(item: WishlistItem): Promise<void> {
  if (await remove(item.id)) show(`${nicknameOf(item)} quitte la wishlist.`)
  else if (apiStatus.value === 'offline') show(OFFLINE)
}

async function onRename(item: WishlistItem, nickname: string): Promise<void> {
  const before = nicknameOf(item)
  if (!(await rename(item.id, nickname))) {
    if (apiStatus.value === 'offline') show(OFFLINE)
    return
  }
  const after = nicknameOf(wishlist.value.find((p) => p.id === item.id) ?? item)
  if (after !== before) show(`${before} s'appelle maintenant ${after} !`)
}

async function onClear(): Promise<void> {
  if (await clear()) show('La wishlist est vide.')
  else show(OFFLINE)
}
</script>

<template>
  <div class="min-h-screen pb-28">
    <GardenScene />

    <main
      class="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8"
    >
      <h1 class="sr-only">Ma wishlist</h1>
      <NuxtLink to="/" class="pixel-btn pixel-btn--ghost self-start">
        &lt; Accueil
      </NuxtLink>

      <section class="flex flex-col gap-4" aria-labelledby="search-title">
        <h2 id="search-title" class="pixel-label self-start text-xs uppercase">
          <span><span class="text-red">&gt;</span> Recherche</span>
        </h2>
        <form class="relative" role="search" @submit.prevent="onSubmit">
          <span
            class="blink pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-red"
            aria-hidden="true"
            >&gt;</span
          >
          <input
            v-model="query"
            type="search"
            class="pixel-input"
            placeholder="Nom ou numéro..."
            aria-label="Rechercher un Pokémon"
            autocomplete="off"
            spellcheck="false"
          />
        </form>

        <p
          v-if="remoteStatus === 'loading' || (status === 'pending' && query)"
          class="dialog"
        >
          Chargement<span class="blink">...</span>
        </p>

        <ul
          v-else-if="results.length"
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
        >
          <li v-for="p in results" :key="p.id">
            <PokemonCard :pokemon="p">
              <button
                v-if="has(p.id)"
                type="button"
                class="pixel-btn w-[calc(100%-8px)]"
                disabled
              >
                Dans la liste
              </button>
              <button
                v-else-if="isFull"
                type="button"
                class="pixel-btn w-[calc(100%-8px)]"
                disabled
              >
                Liste pleine
              </button>
              <button
                v-else
                type="button"
                class="pixel-btn w-[calc(100%-8px)]"
                @click="onAdd(p)"
              >
                + Ajouter
              </button>
            </PokemonCard>
          </li>
        </ul>

        <p v-else-if="remoteStatus === 'notfound'" class="dialog">
          « {{ query }} » est introuvable sur PokéAPI (404).
        </p>

        <p
          v-else-if="error || remoteStatus === 'error'"
          class="dialog text-red"
        >
          Impossible de contacter PokéAPI...
        </p>

        <p v-else-if="query" class="dialog">
          Aucun Pokémon ne s'appelle « {{ query }} »... Appuie sur Entrée pour
          demander à PokéAPI.
        </p>
      </section>

      <section class="flex flex-col gap-4" aria-labelledby="wishlist-title">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="wishlist-title" class="pixel-label text-xs uppercase">
            <span><span class="text-red">&gt;</span> Ma wishlist</span>
            <span class="pixel-badge"
              >{{ wishlist.length }}/{{ MAX_WISHLIST }}</span
            >
          </h2>
          <button
            v-if="wishlist.length"
            type="button"
            class="pixel-btn pixel-btn--ghost"
            @click="onClear"
          >
            Tout vider
          </button>
        </div>

        <p v-if="apiStatus === 'offline'" class="dialog text-red" role="alert">
          L'API ne répond pas : voici la dernière liste connue.
        </p>

        <ul
          v-if="wishlist.length"
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
        >
          <li v-for="p in wishlist" :key="p.id">
            <WishlistCard
              :item="p"
              @rename="onRename(p, $event)"
              @remove="onRemove(p)"
            />
          </li>
        </ul>
        <p v-else class="dialog text-center text-muted">
          Ta wishlist est vide. Ajoute des Pokémon depuis la recherche !
        </p>
      </section>
    </main>
  </div>
</template>
