import { afterEach, beforeEach, vi } from 'vitest'

// Aucun test n'a le droit d'utiliser le vrai réseau : tout appel à fetch
// non mocké échoue. Les tests passent donc même sans connexion à PokéAPI.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Réseau interdit dans les tests'))),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})
