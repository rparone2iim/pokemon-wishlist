import type { Api } from '~/utils/api'
import { createApi } from '~/utils/api'

// Dans le navigateur, un seul client pour toute l'appli
let api: Api | undefined

/** Le client de l'API Hono, dans la langue choisie. */
export function useApi(): Api {
  const { locale } = useI18n()
  const base = useRuntimeConfig().public.apiBase
  // Côté serveur, un client par requête : la langue d'un visiteur ne doit
  // jamais servir à un autre.
  if (import.meta.server) return createApi(base, () => locale.value)
  api ??= createApi(base, () => locale.value)
  return api
}
