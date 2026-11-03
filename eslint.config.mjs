// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Pas de traces de debug dans le code poussé
    'no-console': 'error',
    'no-debugger': 'error',
  },
})
