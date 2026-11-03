import type { Locale, MessageKey, Params } from '~/utils/i18n'
import {
  LOCALES,
  LOCALE_STORAGE_KEY,
  savedLocale,
  translate,
} from '~/utils/i18n'

/** La langue de l'appli (anglais par défaut), partagée par toutes les pages. */
export function useI18n() {
  const locale = useState<Locale>('locale', () =>
    savedLocale(import.meta.client ? window.localStorage : undefined),
  )

  function setLocale(code: Locale): void {
    locale.value = code
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
    } catch {
      // Stockage bloqué : la langue reste choisie jusqu'au rechargement
    }
  }

  const t = (key: MessageKey, params?: Params) =>
    translate(locale.value, key, params)

  return { locale, locales: LOCALES, setLocale, t }
}
