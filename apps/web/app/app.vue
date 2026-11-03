<script setup lang="ts">
const { locale } = useI18n()

// <html lang> suit la langue choisie
useHead(() => ({ htmlAttrs: { lang: locale.value } }))
</script>

<template>
  <LanguageSwitcher />
  <NuxtPage />
  <PixelToast />
</template>
