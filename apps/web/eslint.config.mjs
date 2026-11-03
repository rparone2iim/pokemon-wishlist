// @ts-check
import prettier from 'eslint-config-prettier/flat'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Pas de traces de debug dans le code poussé
      'no-console': 'error',
      'no-debugger': 'error',
    },
  },
  // Désactive les règles ESLint de mise en forme : c'est Prettier qui s'en charge.
  prettier,
)
