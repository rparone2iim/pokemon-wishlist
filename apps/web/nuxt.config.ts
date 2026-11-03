import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  // Rendu côté serveur (SSR) : les pages arrivent déjà remplies, fiches Pokémon comprises
  ssr: true,
  devtools: { enabled: true },
  app: {
    head: {
      title: 'PokéWishlist',
      htmlAttrs: { lang: 'en' },
    },
  },
  css: ['@fontsource/press-start-2p', '~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Adresse de l'API Hono (apps/api), modifiable avec NUXT_PUBLIC_API_BASE
      apiBase: 'http://localhost:3001',
      // Commit déployé (GITHUB_SHA dans la CI) : affiché en bas de page
      version: (process.env.GITHUB_SHA ?? 'dev').slice(0, 7),
    },
  },
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
