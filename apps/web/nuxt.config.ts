import tailwindcss from '@tailwindcss/vite'
import { pokemonRoutes, prerenderLimit } from './prerender'

// Fiches Pokémon prégénérées au build : PRERENDER_POKEMON=151 (0 ou absent = aucune)
const PRERENDER_LIMIT = prerenderLimit(process.env.PRERENDER_POKEMON)

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
      // Commit déployé (APP_VERSION dans la CD, sinon GITHUB_SHA) : affiché en bas de page
      version: (
        process.env.APP_VERSION ??
        process.env.GITHUB_SHA ??
        'dev'
      ).slice(0, 7),
    },
  },
  compatibilityDate: '2025-07-15',
  experimental: {
    // Pas de manifeste d'app (builds/meta) : les données viennent toujours de
    // l'API, et WebKit signalait une erreur quand une navigation coupait son chargement
    appManifest: false,
  },
  nitro: {
    prerender: {
      // Une fiche qui n'a pas pu être générée fait échouer le build (pas de page cassée en ligne)
      failOnError: true,
      // 3 pages à la fois : l'API Lambda d'un compte AWS neuf n'accepte que
      // 10 exécutions simultanées
      concurrency: 3,
      retry: 3,
      retryDelay: 1000,
    },
  },
  hooks: {
    // Les noms viennent de PokéAPI, puis les routes sont ajoutées à prerender
    async 'nitro:config'(nitroConfig) {
      if (!PRERENDER_LIMIT) return
      const routes = await pokemonRoutes(
        PRERENDER_LIMIT,
        process.env.PRERENDER_POKEAPI_URL,
      )
      nitroConfig.prerender ??= {}
      nitroConfig.prerender.routes = [
        ...(nitroConfig.prerender.routes ?? []),
        ...routes,
      ]
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Pré-compile cette dépendance au démarrage : sinon Vite la découvre au
    // premier chargement, recharge la page et peut charger Vue en double.
    optimizeDeps: {
      include: ['@vue/devtools-core'],
    },
  },
})
