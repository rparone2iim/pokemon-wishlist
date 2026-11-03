<script setup lang="ts">
useHead({ title: 'PokéWishlist' })

const { wishlist } = useWishlist()
const count: string = wishlist.value.length
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
        Bienvenue dans le jardin ! Des Pokémon sauvages s'y baladent... Lesquels
        veux-tu capturer ?
      </p>

      <div class="flex flex-wrap items-stretch justify-center gap-4">
        <NuxtLink to="/wishlist" class="pixel-btn px-6 py-4 text-[11px]">
          &gt; Commencer
        </NuxtLink>
        <span
          v-if="wishlist.length"
          class="pixel-badge inline-flex items-center px-4 py-4 text-[11px]"
        >
          {{ count }} dans ta wishlist
        </span>
      </div>
    </main>
  </div>
</template>
