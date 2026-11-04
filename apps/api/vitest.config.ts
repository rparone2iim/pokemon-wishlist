import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Couverture des tests (npm run test:coverage) : rapport HTML, résumé JSON
    // lu par la CI (tableau et badge), lcov pour les outils
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts'],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
    // Base PostgreSQL de test : créée, schéma appliqué, nettoyée à la fin
    globalSetup: ['test/global-setup.ts'],
    // Les fichiers de test partagent cette base : un fichier à la fois
    fileParallelism: false,
  },
})
