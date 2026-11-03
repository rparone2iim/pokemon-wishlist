import { describe, expect, it } from 'vitest'
import { MAX_WISHLIST, addPokemon } from '../src/store.js'
import type { Pokemon, WishlistItem } from '../src/types.js'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const pikachu: Pokemon = { id: 25, name: 'pikachu' }

function fullList(): WishlistItem[] {
  return Array.from({ length: MAX_WISHLIST }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    addedAt: NOW.toISOString(),
  }))
}

describe('addPokemon (règle des 6 Pokémon)', () => {
  it('ajoute un Pokémon dans une liste vide', () => {
    const result = addPokemon([], pikachu, NOW)

    expect(result.ok).toBe(true)
    expect(result.list).toEqual([
      { id: 25, name: 'pikachu', addedAt: NOW.toISOString() },
    ])
  })

  it('ne modifie pas la liste de départ', () => {
    const start: WishlistItem[] = []
    addPokemon(start, pikachu, NOW)

    expect(start).toHaveLength(0)
  })

  it('refuse un doublon', () => {
    const first = addPokemon([], pikachu, NOW)
    const second = addPokemon(first.list, pikachu, NOW)

    expect(second).toMatchObject({ ok: false, error: 'duplicate' })
    expect(second.list).toHaveLength(1)
  })

  it('accepte jusqu’à 6 Pokémon', () => {
    const result = addPokemon(fullList().slice(0, MAX_WISHLIST - 1), pikachu)

    expect(MAX_WISHLIST).toBe(6)
    expect(result.ok).toBe(true)
    expect(result.list).toHaveLength(6)
  })

  it('refuse un 7e Pokémon quand la liste est pleine', () => {
    const result = addPokemon(fullList(), pikachu)

    expect(result).toMatchObject({ ok: false, error: 'full' })
    expect(result.list).toHaveLength(MAX_WISHLIST)
  })
})
