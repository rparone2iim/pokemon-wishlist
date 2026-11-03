// Récupère une seule fois la liste complète des Pokémon, via l'API Hono
// (c'est elle qui interroge PokéAPI).
export function usePokedex() {
  const api = useApi()
  // Chargée dans le navigateur seulement : la liste complète n'alourdit pas
  // la page rendue par le serveur.
  return useAsyncData('pokedex', () => api.listPokemon(), { server: false })
}
