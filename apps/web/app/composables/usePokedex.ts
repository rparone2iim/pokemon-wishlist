import { fetchPokemonList } from '~/utils/pokeapi'

// Récupère une seule fois la liste complète des Pokémon depuis PokéAPI.
export function usePokedex() {
  return useAsyncData('pokedex', () => fetchPokemonList())
}
