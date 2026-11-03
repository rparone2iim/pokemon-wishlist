import type { Context } from 'hono'
import { languageDetector } from 'hono/language'
import type { LanguageVariables } from 'hono/language'
import de from './locales/de.json' with { type: 'json' }
import en from './locales/en.json' with { type: 'json' }
import es from './locales/es.json' with { type: 'json' }
import fr from './locales/fr.json' with { type: 'json' }

/** Les langues de l'API ; l'anglais par défaut. */
export const LANGUAGES = ['en', 'fr', 'es', 'de'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

/** Variables de contexte de l'API (la langue de la requête). */
export type AppEnv = { Variables: LanguageVariables }

export type ErrorKey = keyof (typeof en)['errors']
type Messages = { errors: Partial<Record<ErrorKey, string>> }

// en.json est la référence ; une clé absente d'une autre langue retombe sur
// l'anglais (et le script scripts/check-locales.mjs la signale dans la CI).
const MESSAGES: Record<Language, Messages> = { en, fr, es, de }

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

/** Un message d'erreur dans la langue demandée, avec ses paramètres ({max}…). */
export function translate(
  language: string,
  key: ErrorKey,
  params: Record<string, string | number> = {},
): string {
  const lang = isLanguage(language) ? language : DEFAULT_LANGUAGE
  const text = MESSAGES[lang].errors[key] ?? en.errors[key]
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Le message d'erreur dans la langue de la requête en cours. */
export function t(
  c: Context<AppEnv>,
  key: ErrorKey,
  params?: Record<string, string | number>,
): string {
  return translate(c.get('language'), key, params)
}

/**
 * Détecte la langue de la requête : ?lang=fr, sinon l'en-tête Accept-Language
 * envoyé par le front (« de-DE,de;q=0.9 » donne « de »), sinon l'anglais.
 */
export const detectLanguage = languageDetector({
  supportedLanguages: [...LANGUAGES],
  fallbackLanguage: DEFAULT_LANGUAGE,
  order: ['querystring', 'header'],
  lookupQueryString: 'lang',
  caches: false,
  convertDetectedLanguage: (lang) => lang.split('-')[0]!.toLowerCase(),
})
