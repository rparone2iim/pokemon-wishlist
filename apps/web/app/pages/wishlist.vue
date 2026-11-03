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
  like,
  clear,
} = useWishlist()
const { show } = useToast()
const api = useApi()
const { t } = useI18n()

useHead(() => ({ title: `${t('wishlist.pageTitle')} · PokéWishlist` }))

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
    remote.value = found.ok ? found.pokemon : null
    remoteStatus.value = found.ok ? 'idle' : 'notfound'
  } catch {
    remoteStatus.value = 'error'
  }
}

const offline = () => show(t('toast.offline'))

async function onAdd(pokemon: Pokemon): Promise<void> {
  const name = displayName(pokemon.name)
  const result = await add(pokemon)
  if (result.ok) return show(t('toast.added', { name }))
  // Refus de l'API (409) : son message, déjà traduit dans la langue choisie
  if (result.message) return show(result.message)
  if (result.error === 'duplicate') show(t('toast.duplicate', { name }))
  else if (result.error === 'full') show(t('toast.full', { max: MAX_WISHLIST }))
  else offline()
}

async function onRemove(item: WishlistItem): Promise<void> {
  if (await remove(item.id))
    show(t('toast.removed', { name: nicknameOf(item) }))
  else if (apiStatus.value === 'offline') offline()
}

async function onRename(item: WishlistItem, nickname: string): Promise<void> {
  const before = nicknameOf(item)
  if (!(await rename(item.id, nickname))) {
    if (apiStatus.value === 'offline') offline()
    return
  }
  const after = nicknameOf(wishlist.value.find((p) => p.id === item.id) ?? item)
  if (after !== before) show(t('toast.renamed', { before, after }))
}

async function onLike(item: WishlistItem): Promise<void> {
  if (!(await like(item.id)) && apiStatus.value === 'offline') offline()
}

async function onClear(): Promise<void> {
  if (await clear()) show(t('toast.cleared'))
  else offline()
}
</script>

<template>
  <div class="min-h-screen pb-28">
    <GardenScene />

    <main
      class="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8"
    >
      <h1 class="sr-only">{{ t('wishlist.pageTitle') }}</h1>
      <NuxtLink to="/" class="pixel-btn pixel-btn--ghost self-start">
        {{ t('wishlist.back') }}
      </NuxtLink>

      <section class="flex flex-col gap-4" aria-labelledby="search-title">
        <h2 id="search-title" class="pixel-label self-start text-xs uppercase">
          <span
            ><span class="text-red">&gt;</span> {{ t('wishlist.search') }}</span
          >
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
            :placeholder="t('wishlist.searchPlaceholder')"
            :aria-label="t('wishlist.searchLabel')"
            autocomplete="off"
            spellcheck="false"
          />
        </form>

        <p
          v-if="remoteStatus === 'loading' || (status === 'pending' && query)"
          class="dialog"
        >
          {{ t('wishlist.loading') }}<span class="blink">...</span>
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
                {{ t('wishlist.inList') }}
              </button>
              <button
                v-else-if="isFull"
                type="button"
                class="pixel-btn w-[calc(100%-8px)]"
                disabled
              >
                {{ t('wishlist.full') }}
              </button>
              <button
                v-else
                type="button"
                class="pixel-btn w-[calc(100%-8px)]"
                @click="onAdd(p)"
              >
                {{ t('wishlist.add') }}
              </button>
            </PokemonCard>
          </li>
        </ul>

        <p v-else-if="remoteStatus === 'notfound'" class="dialog">
          {{ t('wishlist.notFound', { query }) }}
        </p>

        <p
          v-else-if="error || remoteStatus === 'error'"
          class="dialog text-red"
        >
          {{ t('wishlist.pokeApiDown') }}
        </p>

        <p v-else-if="query" class="dialog">
          {{ t('wishlist.noMatch', { query }) }}
        </p>
      </section>

      <section class="flex flex-col gap-4" aria-labelledby="wishlist-title">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="wishlist-title" class="pixel-label text-xs uppercase">
            <span
              ><span class="text-red">&gt;</span>
              {{ t('wishlist.title') }}</span
            >
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
            {{ t('wishlist.clear') }}
          </button>
        </div>

        <p v-if="apiStatus === 'offline'" class="dialog text-red" role="alert">
          {{ t('wishlist.offline') }}
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
              @like="onLike(p)"
            />
          </li>
        </ul>
        <p v-else class="dialog text-center text-muted">
          {{ t('wishlist.empty') }}
        </p>
      </section>
    </main>
  </div>
</template>
