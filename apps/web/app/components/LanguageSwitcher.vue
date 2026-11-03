<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()
</script>

<template>
  <div
    class="fixed top-3 right-3 z-[300] flex gap-1"
    role="group"
    :aria-label="t('app.language')"
  >
    <button
      v-for="l in locales"
      :key="l.code"
      type="button"
      class="pixel-btn pixel-btn--ghost px-2 py-1 text-[8px] uppercase"
      :class="{ 'pixel-btn--active': l.code === locale }"
      :aria-pressed="l.code === locale"
      :lang="l.code"
      :title="l.name"
      @click="setLocale(l.code)"
    >
      {{ l.code }}
    </button>
  </div>
</template>
