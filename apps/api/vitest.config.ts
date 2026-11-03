import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Base PostgreSQL de test : créée, schéma appliqué, nettoyée à la fin
    globalSetup: ['test/global-setup.ts'],
    // Les fichiers de test partagent cette base : un fichier à la fois
    fileParallelism: false,
  },
})
