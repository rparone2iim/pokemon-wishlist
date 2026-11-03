<script setup lang="ts">
import type { PokemonDetails } from '~/types/pokemon'
import { MAX_WISHLIST } from '~/utils/wishlist'

// Fiche d'un Pokémon : /pokemon/pikachu, /pokemon/25… (via l'API Hono, qui interroge PokéAPI)
const route = useRoute()
const api = useApi()
const { has, isFull, add } = useWishlist()
const { show } = useToast()

const name = computed(() => String(route.params.name ?? ''))

const {
  data: pokemon,
  status,
  error,
} = useAsyncData<PokemonDetails | null>(
  () => `pokemon:${name.value.toLowerCase()}`,
  () => api.getPokemon(name.value),
)

/** Le nom affiché : le nom français s'il est connu, sinon celui de PokéAPI. */
const title = computed(() =>
  pokemon.value
    ? (pokemon.value.frenchName ?? displayName(pokemon.value.name))
    : '',
)

useHead(() => ({
  title: pokemon.value
    ? `${title.value} · PokéWishlist`
    : 'Pokémon introuvable · PokéWishlist',
}))

async function onAdd(details: PokemonDetails): Promise<void> {
  const result = await add({ id: details.id, name: details.name })
  if (result.ok) show(`${title.value} rejoint la wishlist !`)
  else if (result.error === 'duplicate')
    show(`${title.value} est déjà dans ta wishlist !`)
  else if (result.error === 'full')
    show(`Ta wishlist est pleine (${MAX_WISHLIST} max) !`)
  else show("L'API ne répond pas, réessaie plus tard.")
}
</script>

<template>
  <div class="min-h-screen pb-28">
    <GardenScene />

    <main class="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <NuxtLink to="/wishlist" class="pixel-btn pixel-btn--ghost self-start">
        &lt; Wishlist
      </NuxtLink>

      <p v-if="status === 'pending'" class="dialog">
        Chargement<span class="blink">...</span>
      </p>

      <p v-else-if="error" class="dialog text-red" role="alert">
        Impossible de contacter l'API... Réessaie plus tard.
      </p>

      <section
        v-else-if="!pokemon"
        class="flex flex-col gap-4"
        aria-labelledby="notfound-title"
      >
        <h1 id="notfound-title" class="pixel-label self-start text-xs">
          <span><span class="text-red">&gt;</span> Pokémon introuvable</span>
        </h1>
        <p class="dialog dialog--cursor">
          « {{ name }} » est introuvable sur PokéAPI (404). Vérifie le nom ou
          cherche-le depuis la wishlist.
        </p>
      </section>

      <article
        v-else
        class="pixel-box flex flex-col gap-6 p-5"
        :aria-labelledby="`fiche-${pokemon.id}`"
      >
        <div
          class="flex flex-col items-center gap-6 sm:flex-row sm:items-start"
        >
          <div
            class="flex shrink-0 justify-center bg-paper p-2 shadow-[inset_0_-4px_0_0_var(--color-paper-dark)]"
          >
            <img
              :src="spriteUrl(pokemon.id)"
              :alt="title"
              width="192"
              height="192"
              class="size-48 [image-rendering:pixelated]"
            />
          </div>

          <div class="flex flex-col items-center gap-3 sm:items-start">
            <p class="text-[9px] text-muted">{{ dexNumber(pokemon.id) }}</p>
            <h1
              :id="`fiche-${pokemon.id}`"
              class="text-center text-base uppercase [overflow-wrap:anywhere] sm:text-left"
            >
              {{ title }}
            </h1>
            <p
              v-if="pokemon.frenchName"
              class="text-[8px] text-muted uppercase"
            >
              {{ displayName(pokemon.name) }}
            </p>
            <p v-if="pokemon.genus" class="text-[9px]">{{ pokemon.genus }}</p>
            <ul class="flex flex-wrap gap-2" aria-label="Types">
              <li
                v-for="type in pokemon.types"
                :key="type"
                class="px-3 py-1 text-[9px] text-white uppercase [text-shadow:1px_1px_0_var(--color-ink)] shadow-[var(--pixel-border)]"
                :style="{ backgroundColor: typeColor(type) }"
              >
                {{ typeLabel(type) }}
              </li>
            </ul>
          </div>
        </div>

        <p v-if="pokemon.description" class="dialog">
          {{ pokemon.description }}
        </p>

        <dl class="grid grid-cols-1 gap-3 text-[9px] sm:grid-cols-3">
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">Taille</dt>
            <dd>{{ formatHeight(pokemon.height) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">Poids</dt>
            <dd>{{ formatWeight(pokemon.weight) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">Talents</dt>
            <dd>
              <span
                v-for="(ability, i) in pokemon.abilities"
                :key="ability.name"
              >
                {{ displayName(ability.name)
                }}<span v-if="ability.hidden" class="text-muted"> (caché)</span
                ><span v-if="i < pokemon.abilities.length - 1">, </span>
              </span>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="stats-title" class="flex flex-col gap-3">
          <h2 id="stats-title" class="pixel-label self-start text-[10px]">
            <span><span class="text-red">&gt;</span> Statistiques</span>
          </h2>
          <ul class="flex flex-col gap-2">
            <li
              v-for="stat in pokemon.stats"
              :key="stat.name"
              class="grid grid-cols-[6rem_2.5rem_1fr] items-center gap-2 text-[8px]"
            >
              <span class="uppercase">{{ statLabel(stat.name) }}</span>
              <span class="text-right">{{ stat.value }}</span>
              <span
                class="h-3 bg-paper-dark"
                role="meter"
                :aria-label="statLabel(stat.name)"
                :aria-valuenow="stat.value"
                aria-valuemin="0"
                aria-valuemax="255"
              >
                <span
                  class="block h-full"
                  :class="
                    stat.value >= 90
                      ? 'bg-green'
                      : stat.value >= 50
                        ? 'bg-yellow'
                        : 'bg-red'
                  "
                  :style="{ width: `${statPercent(stat.value)}%` }"
                />
              </span>
            </li>
          </ul>
        </section>

        <button
          v-if="has(pokemon.id)"
          type="button"
          class="pixel-btn self-start"
          disabled
        >
          Dans la liste
        </button>
        <button
          v-else-if="isFull"
          type="button"
          class="pixel-btn self-start"
          disabled
        >
          Liste pleine
        </button>
        <button
          v-else
          type="button"
          class="pixel-btn self-start"
          @click="onAdd(pokemon)"
        >
          + Ajouter à la wishlist
        </button>
      </article>
    </main>
  </div>
</template>
