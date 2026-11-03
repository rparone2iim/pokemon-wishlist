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
  compatibilityDate: '2025-07-15',
})
