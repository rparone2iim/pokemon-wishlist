import type { Api } from '~/utils/api'
import { createApi } from '~/utils/api'

let api: Api | undefined

/** Le client de l'API Hono, partagé par toute l'appli. */
export function useApi(): Api {
  api ??= createApi(useRuntimeConfig().public.apiBase)
  return api
}
