<script setup lang="ts">
useHead({ title: 'PokéWishlist' })

const { wishlist } = useWishlist()
const { t } = useI18n()
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <GardenScene />

    <main
      class="relative z-[200] mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pt-[8vh]"
    >
      <div class="flex items-center gap-4">
        <PixelBall class="hop size-12 shrink-0" />
        <h1 class="title">PokéWishlist</h1>
      </div>

      <p class="dialog dialog--cursor w-full">
        {{ t('home.welcome') }}
      </p>

      <div class="flex flex-wrap items-stretch justify-center gap-4">
        <NuxtLink to="/wishlist" class="pixel-btn px-6 py-4 text-[11px]">
          {{ t('home.start') }}
        </NuxtLink>
        <span
          v-if="wishlist.length"
          class="pixel-badge inline-flex items-center px-4 py-4 text-[11px]"
        >
          {{ t('home.count', { count: wishlist.length }) }}
        </span>
      </div>
    </main>
  </div>
</template>
