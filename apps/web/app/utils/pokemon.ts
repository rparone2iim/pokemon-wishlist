export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function displayName(name: string): string {
  return name.replace(/-/g, ' ')
}

export function dexNumber(id: number): string {
  return `No.${String(id).padStart(4, '0')}`
}

/** Les 18 types, en français, avec leur couleur. */
const TYPES: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#a8a77a' },
  fire: { label: 'Feu', color: '#ee8130' },
  water: { label: 'Eau', color: '#6390f0' },
  electric: { label: 'Électrik', color: '#f7d02c' },
  grass: { label: 'Plante', color: '#7ac74c' },
  ice: { label: 'Glace', color: '#96d9d6' },
  fighting: { label: 'Combat', color: '#c22e28' },
  poison: { label: 'Poison', color: '#a33ea1' },
  ground: { label: 'Sol', color: '#e2bf65' },
  flying: { label: 'Vol', color: '#a98ff3' },
  psychic: { label: 'Psy', color: '#f95587' },
  bug: { label: 'Insecte', color: '#a6b91a' },
  rock: { label: 'Roche', color: '#b6a136' },
  ghost: { label: 'Spectre', color: '#735797' },
  dragon: { label: 'Dragon', color: '#6f35fc' },
  dark: { label: 'Ténèbres', color: '#705746' },
  steel: { label: 'Acier', color: '#b7b7ce' },
  fairy: { label: 'Fée', color: '#d685ad' },
}

export function typeLabel(type: string): string {
  return TYPES[type]?.label ?? displayName(type)
}

export function typeColor(type: string): string {
  return TYPES[type]?.color ?? '#a8a77a'
}

const STATS: Record<string, string> = {
  hp: 'PV',
  attack: 'Attaque',
  defense: 'Défense',
  'special-attack': 'Atq. Spé.',
  'special-defense': 'Déf. Spé.',
  speed: 'Vitesse',
}

export function statLabel(stat: string): string {
  return STATS[stat] ?? displayName(stat)
}

/** Une statistique de base va de 1 à 255 : sa part, en pourcentage. */
export function statPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round((value / 255) * 100)))
}

const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** Taille en mètres, à la française : « 0,4 m ». */
export function formatHeight(meters: number): string {
  return `${number.format(meters)} m`
}

/** Poids en kilos, à la française : « 6 kg ». */
export function formatWeight(kilos: number): string {
  return `${number.format(kilos)} kg`
}
