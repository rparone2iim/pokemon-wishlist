export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function displayName(name: string): string {
  return name.replace(/-/g, ' ')
}

export function dexNumber(id: number): string {
  return `No.${String(id).padStart(4, '0')}`
}

/** La couleur de chacun des 18 types (leurs noms sont dans i18n/locales). */
const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a77a',
  fire: '#ee8130',
  water: '#6390f0',
  electric: '#f7d02c',
  grass: '#7ac74c',
  ice: '#96d9d6',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#e2bf65',
  flying: '#a98ff3',
  psychic: '#f95587',
  bug: '#a6b91a',
  rock: '#b6a136',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#b7b7ce',
  fairy: '#d685ad',
}

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#a8a77a'
}

/** Une statistique de base va de 1 à 255 : sa part, en pourcentage. */
export function statPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round((value / 255) * 100)))
}

function formatNumber(value: number, tag: string): string {
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(value)
}

/** Taille en mètres, au format de la langue : « 0.4 m », « 0,4 m ». */
export function formatHeight(meters: number, tag = 'en-US'): string {
  return `${formatNumber(meters, tag)} m`
}

/** Poids en kilos, au format de la langue : « 90.5 kg », « 90,5 kg ». */
export function formatWeight(kilos: number, tag = 'en-US'): string {
  return `${formatNumber(kilos, tag)} kg`
}
