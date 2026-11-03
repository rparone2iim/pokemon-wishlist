export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function displayName(name: string): string {
  return name.replace(/-/g, " ");
}

export function dexNumber(id: number): string {
  return `No.${String(id).padStart(4, '0')}`
}
