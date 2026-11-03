import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      title: 'PokéWishlist',
      htmlAttrs: { lang: 'fr' },
    },
  },
  css: ['@fontsource/press-start-2p', '~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  vite: {
    plugins: [tailwindcss()],
    // Pré-compile cette dépendance au démarrage : sinon Vite la découvre au
    // premier chargement, recharge la page et peut charger Vue en double.
    optimizeDeps: {
      include: ['@vue/devtools-core'],
    },
  },
})
