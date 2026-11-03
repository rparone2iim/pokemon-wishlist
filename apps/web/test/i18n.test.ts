import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_STORAGE_KEY,
  hasMessage,
  localeTag,
  savedLocale,
  translate,
} from '../app/utils/i18n'
import type { MessageKey } from '../app/utils/i18n'

describe('traductions du front', () => {
  it('propose 4 langues, l’anglais par défaut', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['en', 'fr', 'es', 'de'])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('traduit une clé dans chaque langue', () => {
    expect(translate('en', 'wishlist.add')).toBe('+ Add')
    expect(translate('fr', 'wishlist.add')).toBe('+ Ajouter')
    expect(translate('es', 'wishlist.add')).toBe('+ Añadir')
    expect(translate('de', 'wishlist.add')).toBe('+ Hinzufügen')
  })

  it('remplace les paramètres', () => {
    expect(translate('fr', 'toast.added', { name: 'Pikachu' })).toBe(
      'Pikachu rejoint la wishlist !',
    )
    expect(translate('de', 'toast.full', { max: 6 })).toBe(
      'Deine Wunschliste ist voll (max. 6)!',
    )
  })

  it('renvoie la clé si elle n’existe nulle part', () => {
    expect(translate('fr', 'nope.inconnue' as MessageKey)).toBe('nope.inconnue')
    expect(hasMessage('types.electric')).toBe(true)
    expect(hasMessage('types.stellar')).toBe(false)
  })

  it('reprend la langue gardée dans le navigateur, sinon l’anglais', () => {
    const storage = (value: string | null) => ({ getItem: () => value })
    expect(savedLocale(storage('de'))).toBe('de')
    expect(savedLocale(storage('it'))).toBe('en')
    expect(savedLocale(storage(null))).toBe('en')
    expect(savedLocale(undefined)).toBe('en')
    expect(
      savedLocale({
        getItem: () => {
          throw new Error('bloqué')
        },
      }),
    ).toBe('en')
    expect(LOCALE_STORAGE_KEY).toBe('pokewishlist-lang')
  })

  it('donne la balise de langue pour Intl et <html lang>', () => {
    expect(localeTag('es')).toBe('es-ES')
  })
})
