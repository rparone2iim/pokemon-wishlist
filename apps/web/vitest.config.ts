import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Couverture des tests (npm run test:coverage) : rapport HTML, résumé JSON
    // lu par la CI (tableau et badge), lcov pour les outils
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'prerender.ts'],
      exclude: ['app/types/**'],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
