import { describe, expect, it } from 'vitest'
import {
  formatHeight,
  formatWeight,
  statLabel,
  statPercent,
  typeColor,
  typeLabel,
} from '../app/utils/pokemon'

describe('fiche Pokémon : affichage', () => {
  it('traduit les types en français', () => {
    expect(typeLabel('electric')).toBe('Électrik')
    expect(typeLabel('dark')).toBe('Ténèbres')
    expect(typeColor('fire')).toBe('#ee8130')
  })

  it('garde un type inconnu lisible', () => {
    expect(typeLabel('stellar-type')).toBe('stellar type')
  })

  it('traduit les statistiques en français', () => {
    expect(statLabel('hp')).toBe('PV')
    expect(statLabel('special-attack')).toBe('Atq. Spé.')
  })

  it('calcule la longueur de la barre de stat (sur 255)', () => {
    expect(statPercent(255)).toBe(100)
    expect(statPercent(51)).toBe(20)
    expect(statPercent(300)).toBe(100)
  })

  it('affiche taille et poids à la française', () => {
    expect(formatHeight(0.4)).toBe('0,4 m')
    expect(formatWeight(6)).toBe('6 kg')
    expect(formatWeight(460)).toBe('460 kg')
  })
})
