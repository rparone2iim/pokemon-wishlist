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

  const t = (key: MessageKey, params?: Params) =>
    translate(locale.value, key, params)

  return { locale, locales: LOCALES, setLocale, t }
}
