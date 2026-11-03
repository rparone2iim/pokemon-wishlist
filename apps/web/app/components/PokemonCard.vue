<script setup lang="ts">
import type { Pokemon } from '~/types/pokemon'

defineProps<{ pokemon: Pokemon }>()

const { t } = useI18n()
</script>

<template>
  <article class="pixel-box group flex flex-col items-center gap-2 p-3">
    <NuxtLink
      :to="`/pokemon/${pokemon.name}`"
      :aria-label="t('card.viewPage', { name: displayName(pokemon.name) })"
      class="flex w-full justify-center bg-paper py-1 shadow-[inset_0_-4px_0_0_var(--color-paper-dark)] hover:bg-paper-dark focus-visible:outline-4 focus-visible:outline-blue"
    >
      <img
        :src="spriteUrl(pokemon.id)"
        :alt="displayName(pokemon.name)"
        width="96"
        height="96"
        loading="lazy"
        class="size-24 group-hover:animate-[hop_0.5s_steps(2)_infinite]"
      />
    </NuxtLink>
    <p class="text-[8px] text-muted">{{ dexNumber(pokemon.id) }}</p>
    <slot name="name">
      <h3
        class="min-h-[2lh] text-center text-[9px] uppercase [overflow-wrap:anywhere]"
      >
        {{ displayName(pokemon.name) }}
      </h3>
    </slot>
    <slot />
  </article>
</template>
