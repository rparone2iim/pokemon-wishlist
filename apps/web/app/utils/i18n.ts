import de from '../../i18n/locales/de.json'
import en from '../../i18n/locales/en.json'
import es from '../../i18n/locales/es.json'
import fr from '../../i18n/locales/fr.json'

/** Les 4 langues de l'appli ; l'anglais par défaut. */
export const LOCALES = [
  { code: 'en', name: 'English', tag: 'en-US' },
  { code: 'fr', name: 'Français', tag: 'fr-FR' },
  { code: 'es', name: 'Español', tag: 'es-ES' },
  { code: 'de', name: 'Deutsch', tag: 'de-DE' },
] as const

export type Locale = (typeof LOCALES)[number]['code']
export const DEFAULT_LOCALE: Locale = 'en'

/** Où la langue choisie est gardée dans le navigateur. */
export const LOCALE_STORAGE_KEY = 'pokewishlist-lang'

type Dictionary = { [key: string]: string | Dictionary }

// en.json est la référence : une clé absente d'une autre langue retombe sur
// l'anglais (et scripts/check-locales.mjs la signale dans la CI).
const MESSAGES: Record<Locale, Dictionary> = { en, fr, es, de }

/** Toutes les clés de en.json, sous la forme « wishlist.title ». */
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>
}[keyof T & string]
export type MessageKey = Paths<typeof en>

export type Params = Record<string, string | number>

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale.code === value)
}

/** Balise de langue pour Intl et <html lang> (« fr-FR »…). */
export function localeTag(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.tag ?? 'en-US'
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** La clé existe-t-elle (en anglais, la référence) ? */
export function hasMessage(key: string): boolean {
  return lookup(en, key) !== undefined
}

/** Le texte d'une clé dans une langue, avec ses paramètres ({name}…). */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Params = {},
): string {
  const text = lookup(MESSAGES[locale], key) ?? lookup(en, key) ?? key
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** La langue gardée dans le navigateur, sinon l'anglais. */
export function savedLocale(
  storage: Pick<Storage, 'getItem'> | undefined,
): Locale {
  try {
    const value = storage?.getItem(LOCALE_STORAGE_KEY)
    return isLocale(value) ? value : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}
