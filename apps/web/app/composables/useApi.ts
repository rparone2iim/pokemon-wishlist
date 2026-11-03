import type { Api } from '~/utils/api'
import { createApi } from '~/utils/api'

let api: Api | undefined

/** Le client de l'API Hono, partagé par toute l'appli (dans la langue choisie). */
export function useApi(): Api {
  if (!api) {
    const { locale } = useI18n()
    api = createApi(useRuntimeConfig().public.apiBase, () => locale.value)
  }
  return api
}
