import { describe, expect, it } from 'vitest'
import type { Pokemon, WishlistItem } from '../app/types/pokemon'
import {
  MAX_NICKNAME,
  MAX_WISHLIST,
  addPokemon,
  isInWishlist,
  nicknameOf,
  removePokemon,
  renamePokemon,
} from '../app/utils/wishlist'

const pikachu: Pokemon = { id: 25, name: 'pikachu' }

function fullList(): WishlistItem[] {
  return Array.from({ length: MAX_WISHLIST }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    addedAt: '2026-11-03T10:00:00.000Z',
  }))
}

describe('addPokemon', () => {
  it('ajoute un Pokémon dans une liste vide', () => {
    const result = addPokemon([], pikachu, '2026-11-03T10:00:00.000Z')

    expect(result.ok).toBe(true)
    expect(result.list).toEqual([
      { id: 25, name: 'pikachu', addedAt: '2026-11-03T10:00:00.000Z' },
    ])
  })

  it('ne modifie pas la liste de départ', () => {
    const start: WishlistItem[] = []
    addPokemon(start, pikachu)

    expect(start).toHaveLength(0)
  })

  it('refuse un doublon', () => {
    const first = addPokemon([], pikachu)
    const second = addPokemon(first.list, pikachu)

    expect(second).toMatchObject({ ok: false, error: 'duplicate' })
    expect(second.list).toHaveLength(1)
  })

  it('accepte jusqu’à 6 Pokémon', () => {
    const five = fullList().slice(0, MAX_WISHLIST - 1)
    const result = addPokemon(five, pikachu)

    expect(MAX_WISHLIST).toBe(6)
    expect(result.ok).toBe(true)
    expect(result.list).toHaveLength(6)
  })

  it('refuse un 7e Pokémon quand la liste est pleine', () => {
    const result = addPokemon(fullList(), pikachu)

    expect(result).toMatchObject({ ok: false, error: 'full' })
    expect(result.list).toHaveLength(MAX_WISHLIST)
    expect(isInWishlist(result.list, pikachu.id)).toBe(false)
  })
})

describe('removePokemon', () => {
  it('retire le Pokémon demandé', () => {
    const list = removePokemon(fullList(), 3)

    expect(list).toHaveLength(MAX_WISHLIST - 1)
    expect(isInWishlist(list, 3)).toBe(false)
  })
})

describe('renamePokemon', () => {
  const list: WishlistItem[] = [
    { id: 25, name: 'pikachu', addedAt: '2026-11-03T10:00:00.000Z' },
  ]

  it('affiche le vrai nom tant qu’il n’y a pas de surnom', () => {
    expect(nicknameOf(list[0]!)).toBe('pikachu')
  })

  it('donne un surnom sans toucher au vrai nom', () => {
    const [renamed] = renamePokemon(list, 25, '  Sparky  ')

    expect(renamed).toMatchObject({
      id: 25,
      name: 'pikachu',
      nickname: 'Sparky',
    })
    expect(nicknameOf(renamed!)).toBe('Sparky')
    expect(list[0]).not.toHaveProperty('nickname')
  })

  it(`coupe le surnom à ${MAX_NICKNAME} caractères`, () => {
    const [renamed] = renamePokemon(list, 25, 'Un surnom beaucoup trop long')

    expect(renamed?.nickname).toHaveLength(MAX_NICKNAME)
  })

  it('remet le vrai nom si le surnom est vide ou identique', () => {
    const named = renamePokemon(list, 25, 'Sparky')

    expect(renamePokemon(named, 25, '   ')[0]).not.toHaveProperty('nickname')
    expect(renamePokemon(named, 25, 'PIKACHU')[0]).not.toHaveProperty(
      'nickname',
    )
  })

  it('ne renomme que le Pokémon demandé', () => {
    const two = [
      ...list,
      { id: 1, name: 'bulbasaur', addedAt: '2026-11-03T10:00:00.000Z' },
    ]
    const result = renamePokemon(two, 1, 'Bulbi')

    expect(result[0]).toBe(two[0])
    expect(result[1]?.nickname).toBe('Bulbi')
  })
})
