<script setup lang="ts">
const { locale, syncFromCookie } = useI18n()
// Après l'hydratation (pages prégénérées en anglais) : la langue du cookie
onMounted(syncFromCookie)
const { version } = useRuntimeConfig().public

// <html lang> suit la langue choisie ; la version déployée est dans une balise meta
useHead(() => ({
  htmlAttrs: { lang: locale.value },
  meta: [{ name: 'app-version', content: version }],
}))
</script>

<template>
  <LanguageSwitcher />
  <NuxtPage />
  <PixelToast />
  <p
    class="pointer-events-none fixed right-2 bottom-1 z-[300] text-[7px] text-muted"
  >
    v{{ version }}
  </p>
</template>
