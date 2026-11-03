import { describe, expect, it } from 'vitest'
import type { WishlistItem } from '../app/types/pokemon'
import type { WishlistStorage } from '../app/utils/storage'
import { STORAGE_KEY, loadWishlist, saveWishlist } from '../app/utils/storage'

/** Faux localStorage en mémoire (pas de navigateur dans les tests). */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  } satisfies WishlistStorage & { data: Map<string, string> }
}

const pikachu: WishlistItem = {
  id: 25,
  name: 'pikachu',
  addedAt: '2026-11-03T10:00:00.000Z',
  nickname: 'Sparky',
}
const bulbasaur: WishlistItem = {
  id: 1,
  name: 'bulbasaur',
  addedAt: '2026-11-03T10:05:00.000Z',
}

describe('saveWishlist', () => {
  it('sauvegarde la wishlist en JSON sous la bonne clé', () => {
    const storage = memoryStorage()

    expect(saveWishlist(storage, [pikachu, bulbasaur])).toBe(true)
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual([
      pikachu,
      bulbasaur,
    ])
  })

  it('renvoie false sans planter si le stockage est plein', () => {
    const full: WishlistStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota dépassé', 'QuotaExceededError')
      },
    }

    expect(saveWishlist(full, [pikachu])).toBe(false)
  })
})

describe('loadWishlist', () => {
  it('relit exactement ce qui a été sauvegardé', () => {
    const storage = memoryStorage()
    saveWishlist(storage, [pikachu, bulbasaur])

    expect(loadWishlist(storage)).toEqual([pikachu, bulbasaur])
  })

  it('renvoie une liste vide quand le stockage est vide', () => {
    expect(loadWishlist(memoryStorage())).toEqual([])
    expect(loadWishlist(memoryStorage({ [STORAGE_KEY]: '' }))).toEqual([])
  })

  it('renvoie une liste vide sans planter si le JSON est invalide', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{pas du json' })

    expect(() => loadWishlist(storage)).not.toThrow()
    expect(loadWishlist(storage)).toEqual([])
  })

  it('renvoie une liste vide si le JSON n’est pas un tableau', () => {
    for (const raw of ['{"id":25}', '42', 'null', '"pikachu"']) {
      expect(loadWishlist(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual([])
    }
  })

  it('ignore les entrées abîmées et les doublons', () => {
    const raw = JSON.stringify([
      pikachu,
      null,
      { id: '7', name: 'squirtle' },
      { id: 4 },
      { id: 133, name: 'eevee' },
      pikachu,
    ])

    expect(loadWishlist(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual([
      pikachu,
      { id: 133, name: 'eevee', addedAt: '' },
    ])
  })

  it('renvoie une liste vide si le stockage est inaccessible', () => {
    const blocked: WishlistStorage = {
      getItem: () => {
        throw new DOMException('Accès refusé', 'SecurityError')
      },
      setItem: () => {},
    }

    expect(loadWishlist(blocked)).toEqual([])
  })
})
