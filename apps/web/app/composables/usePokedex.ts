// Récupère une seule fois la liste complète des Pokémon, via l'API Hono
// (c'est elle qui interroge PokéAPI).
export function usePokedex() {
  const api = useApi()
  return useAsyncData('pokedex', () => api.listPokemon())
}
