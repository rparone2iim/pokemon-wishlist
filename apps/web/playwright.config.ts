import { defineConfig, devices } from '@playwright/test'

/** Ports dédiés aux tests E2E, pour ne pas gêner les serveurs de dev (3000/3001). */
export const WEB_URL = 'http://localhost:4000'
export const API_URL = 'http://localhost:4001'
export const POKEAPI_URL = 'http://localhost:4002/api/v2'
/** Base PostgreSQL des tests E2E : jamais celle de Supabase. */
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://localhost:5432/pokewishlist_e2e'

const CI = Boolean(process.env.CI)
// En CI, les serveurs sont démarrés par une étape du workflow (voir ci.yml) :
// Playwright vérifie qu'ils répondent et les utilise tels quels.
const reuseExistingServer = !CI || Boolean(process.env.E2E_SERVERS_STARTED)

export default defineConfig({
  testDir: 'e2e',
  // Les tests partagent la wishlist en mémoire de l'API : un seul à la fois
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Lance une fausse PokéAPI, la vraie API Hono (sur la base PostgreSQL de test)
  // et le vrai front (builds de production)
  webServer: [
    {
      command: 'node e2e/mock-pokeapi.mjs',
      url: 'http://localhost:4002/health',
      env: { PORT: '4002' },
      reuseExistingServer,
    },
    {
      command:
        'npm run build -w @pokewishlist/api && npm run db:init -w @pokewishlist/api && npm run start -w @pokewishlist/api',
      cwd: '../..',
      url: `${API_URL}/health`,
      env: { PORT: '4001', CORS_ORIGIN: WEB_URL, POKEAPI_URL, DATABASE_URL },
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'npm run build && node .output/server/index.mjs',
      url: WEB_URL,
      env: { PORT: '4000', NUXT_PUBLIC_API_BASE: API_URL },
      reuseExistingServer,
      timeout: 240_000,
    },
  ],
})
