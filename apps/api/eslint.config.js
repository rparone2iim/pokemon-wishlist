// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dist-lambda'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Comme pour le front : pas de console.log ni de debugger oubliés
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
  // Désactive les règles de mise en forme : c'est Prettier qui s'en charge.
  prettier,
)
