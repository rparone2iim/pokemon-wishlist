import { describe, expect, it } from 'vitest'
import {
  formatHeight,
  formatWeight,
  statPercent,
  typeColor,
} from '../app/utils/pokemon'

describe('fiche Pokémon : affichage', () => {
  it('donne la couleur de chaque type', () => {
    expect(typeColor('fire')).toBe('#ee8130')
    expect(typeColor('type-inconnu')).toBe('#a8a77a')
  })

  it('calcule la longueur de la barre de stat (sur 255)', () => {
    expect(statPercent(255)).toBe(100)
    expect(statPercent(51)).toBe(20)
    expect(statPercent(300)).toBe(100)
  })

  it('affiche taille et poids au format de la langue', () => {
    expect(formatHeight(0.4)).toBe('0.4 m')
    expect(formatWeight(90.5)).toBe('90.5 kg')
    expect(formatHeight(0.4, 'fr-FR')).toBe('0,4 m')
    expect(formatWeight(90.5, 'de-DE')).toBe('90,5 kg')
  })
})
