<script setup lang="ts">
import type { PokemonDetails } from '~/types/pokemon'
import type { PokemonLookup } from '~/utils/api'
import type { MessageKey } from '~/utils/i18n'
import { hasMessage, localeTag } from '~/utils/i18n'
import { MAX_WISHLIST } from '~/utils/wishlist'

// Fiche d'un Pokémon : /pokemon/pikachu, /pokemon/25… (via l'API Hono, qui interroge PokéAPI)
const route = useRoute()
const api = useApi()
const { has, isFull, add } = useWishlist()
const { show } = useToast()
const { t, locale } = useI18n()

const name = computed(() => String(route.params.name ?? ''))

// La clé contient la langue : changer de langue redemande la fiche (et le
// message d'erreur de l'API) dans la nouvelle langue.
const {
  data: lookup,
  status,
  error,
} = useAsyncData<PokemonLookup>(
  () => `pokemon:${locale.value}:${name.value.toLowerCase()}`,
  () => api.getPokemon(name.value),
)

const pokemon = computed<PokemonDetails | null>(() =>
  lookup.value?.ok ? lookup.value.pokemon : null,
)
/** Message de l'API quand le Pokémon est introuvable, traduit par l'API. */
const apiMessage = computed(() =>
  lookup.value && !lookup.value.ok ? lookup.value.message : '',
)

/** Le nom affiché : le nom dans la langue choisie s'il est connu, sinon celui de PokéAPI. */
const title = computed(() =>
  pokemon.value
    ? (pokemon.value.localName ?? displayName(pokemon.value.name))
    : '',
)

const tag = computed(() => localeTag(locale.value))

/** Libellé traduit d'un type ou d'une stat ; un nom inconnu reste lisible. */
function label(group: 'types' | 'stats', key: string): string {
  const path = `${group}.${key}`
  return hasMessage(path) ? t(path as MessageKey) : displayName(key)
}

useHead(() => ({
  title: `${pokemon.value ? title.value : t('pokemon.notFoundTitle')} · PokéWishlist`,
}))

async function onAdd(details: PokemonDetails): Promise<void> {
  const result = await add({ id: details.id, name: details.name })
  if (result.ok) return show(t('toast.added', { name: title.value }))
  if (result.message) return show(result.message)
  if (result.error === 'duplicate')
    show(t('toast.duplicate', { name: title.value }))
  else if (result.error === 'full') show(t('toast.full', { max: MAX_WISHLIST }))
  else show(t('toast.offline'))
}
</script>

<template>
  <div class="min-h-screen pb-28">
    <GardenScene />

    <main class="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <NuxtLink to="/wishlist" class="pixel-btn pixel-btn--ghost self-start">
        {{ t('pokemon.back') }}
      </NuxtLink>

      <p v-if="status === 'pending'" class="dialog">
        {{ t('wishlist.loading') }}<span class="blink">...</span>
      </p>

      <p v-else-if="error" class="dialog text-red" role="alert">
        {{ t('pokemon.apiDown') }}
      </p>

      <section
        v-else-if="!pokemon"
        class="flex flex-col gap-4"
        aria-labelledby="notfound-title"
      >
        <h1 id="notfound-title" class="pixel-label self-start text-xs">
          <span
            ><span class="text-red">&gt;</span>
            {{ t('pokemon.notFoundTitle') }}</span
          >
        </h1>
        <p class="dialog dialog--cursor">
          <!-- Le message vient de l'API Hono (404), traduit par elle -->
          {{ t('pokemon.notFoundMessage', { message: apiMessage, name }) }}
          {{ t('pokemon.notFoundHelp') }}
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
              v-if="
                title.toLowerCase() !== displayName(pokemon.name).toLowerCase()
              "
              class="text-[8px] text-muted uppercase"
            >
              {{ displayName(pokemon.name) }}
            </p>
            <p v-if="pokemon.genus" class="text-[9px]">{{ pokemon.genus }}</p>
            <ul class="flex flex-wrap gap-2" :aria-label="t('pokemon.types')">
              <li
                v-for="type in pokemon.types"
                :key="type"
                class="px-3 py-1 text-[9px] text-white uppercase [text-shadow:1px_1px_0_var(--color-ink)] shadow-[var(--pixel-border)]"
                :style="{ backgroundColor: typeColor(type) }"
              >
                {{ label('types', type) }}
              </li>
            </ul>
          </div>
        </div>

        <p v-if="pokemon.description" class="dialog">
          {{ pokemon.description }}
        </p>

        <dl class="grid grid-cols-1 gap-3 text-[9px] sm:grid-cols-3">
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">{{ t('pokemon.height') }}</dt>
            <dd>{{ formatHeight(pokemon.height, tag) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">{{ t('pokemon.weight') }}</dt>
            <dd>{{ formatWeight(pokemon.weight, tag) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-muted uppercase">
              {{ t('pokemon.abilities') }}
            </dt>
            <dd>
              <span
                v-for="(ability, i) in pokemon.abilities"
                :key="ability.name"
              >
                {{ displayName(ability.name)
                }}<span v-if="ability.hidden" class="text-muted">{{
                  ` ${t('pokemon.hidden')}`
                }}</span
                ><span v-if="i < pokemon.abilities.length - 1">, </span>
              </span>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="stats-title" class="flex flex-col gap-3">
          <h2 id="stats-title" class="pixel-label self-start text-[10px]">
            <span
              ><span class="text-red">&gt;</span> {{ t('pokemon.stats') }}</span
            >
          </h2>
          <ul class="flex flex-col gap-2">
            <li
              v-for="stat in pokemon.stats"
              :key="stat.name"
              class="grid grid-cols-[6rem_2.5rem_1fr] items-center gap-2 text-[8px]"
            >
              <span class="uppercase">{{ label('stats', stat.name) }}</span>
              <span class="text-right">{{ stat.value }}</span>
              <span
                class="h-3 bg-paper-dark"
                role="meter"
                :aria-label="label('stats', stat.name)"
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
          {{ t('wishlist.inList') }}
        </button>
        <button
          v-else-if="isFull"
          type="button"
          class="pixel-btn self-start"
          disabled
        >
          {{ t('wishlist.full') }}
        </button>
        <button
          v-else
          type="button"
          class="pixel-btn self-start"
          @click="onAdd(pokemon)"
        >
          {{ t('pokemon.addToWishlist') }}
        </button>
      </article>
    </main>
  </div>
</template>
