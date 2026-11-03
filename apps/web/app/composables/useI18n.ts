import type { Locale, MessageKey, Params } from '~/utils/i18n'
import { LOCALES, LOCALE_COOKIE, parseLocale, translate } from '~/utils/i18n'

/**
 * La langue de l'appli (anglais par défaut), partagée par toutes les pages.
 * Elle est gardée dans un cookie : le serveur (SSR) rend la page directement
 * dans la bonne langue.
 */
export function useI18n() {
  const cookie = useCookie<string | null>(LOCALE_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    default: () => null,
  })
  const locale = useState<Locale>('locale', () => parseLocale(cookie.value))

  function setLocale(code: Locale): void {
    locale.value = code
    cookie.value = code
  }

  /**
   * Une page prégénérée au build est rendue en anglais : une fois hydratée,
   * on repasse dans la langue du cookie.
   */
  function syncFromCookie(): void {
    const saved = parseLocale(cookie.value)
    if (saved !== locale.value) locale.value = saved
  }

  const t = (key: MessageKey, params?: Params) =>
    translate(locale.value, key, params)

  return { locale, locales: LOCALES, setLocale, syncFromCookie, t }
}
