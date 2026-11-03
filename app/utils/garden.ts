// Dessin du jardin en pixel art sur un canvas basse résolution.
// 1 pixel du canvas = PX pixels à l'écran (agrandi avec image-rendering: pixelated).
export const PX = 4

type Ctx = CanvasRenderingContext2D

export interface Cloud {
  x: number
  y: number
  size: number
  speed: number
}

// Générateur pseudo-aléatoire déterministe : le jardin est le même à chaque visite.
export function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y))
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1)
  }
}

export function grassTop(h: number) {
  return Math.round(h * 0.64)
}

export function drawSky(ctx: Ctx, w: number, h: number) {
  const bands = ['#5cb8ef', '#72c4f2', '#8ad0f5', '#a6dcf7', '#c3e8f9']
  const bandH = Math.ceil((h * 0.6) / bands.length)
  bands.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(0, i * bandH, w, i === bands.length - 1 ? h : bandH)
  })
  // tramage entre deux bandes, comme sur les vieilles consoles
  for (let i = 1; i < bands.length; i++) {
    const y = i * bandH
    ctx.fillStyle = bands[i]!
    for (let x = i % 2; x < w; x += 2) ctx.fillRect(x, y - 1, 1, 1)
    ctx.fillStyle = bands[i - 1]!
    for (let x = (i + 1) % 2; x < w; x += 2) ctx.fillRect(x, y, 1, 1)
  }
  // soleil
  const sx = Math.round(w * 0.84)
  const sy = Math.round(h * 0.14)
  disc(ctx, sx, sy, 10, '#ffe9a3')
  disc(ctx, sx, sy, 8, '#ffcc3d')
  disc(ctx, sx - 2, sy - 2, 4, '#ffe066')
}

export function makeClouds(w: number, h: number): Cloud[] {
  const rand = seeded(7)
  return Array.from({ length: Math.max(3, Math.round(w / 70)) }, () => ({
    x: rand() * w,
    y: 8 + rand() * h * 0.3,
    size: 3 + Math.floor(rand() * 3),
    speed: 0.15 + rand() * 0.25,
  }))
}

export function drawCloud(ctx: Ctx, c: Cloud) {
  const x = Math.round(c.x)
  const y = Math.round(c.y)
  const s = c.size
  for (const [color, dy] of [
    ['#d3ebf7', 1],
    ['#ffffff', 0],
  ] as const) {
    disc(ctx, x, y + dy, s, color)
    disc(ctx, x + s + 1, y - Math.ceil(s / 2) + dy, s + 1, color)
    disc(ctx, x + s * 2 + 2, y + dy, s, color)
    ctx.fillStyle = color
    ctx.fillRect(x, y + dy, s * 2 + 3, s + 1)
  }
}

function tree(ctx: Ctx, x: number, base: number, r: number) {
  ctx.fillStyle = '#6b4226'
  ctx.fillRect(x - 1, base - 4, 3, 5)
  disc(ctx, x, base - 4 - r, r, '#2f7d45')
  disc(ctx, x - 1, base - 5 - r, r - 1, '#3d9a52')
  disc(ctx, x - 2, base - 6 - r, Math.max(1, r - 3), '#58b85c')
}

function flower(ctx: Ctx, x: number, y: number, petal: string) {
  ctx.fillStyle = '#3a8a35'
  ctx.fillRect(x, y + 2, 1, 2)
  ctx.fillStyle = petal
  ctx.fillRect(x - 1, y, 3, 1)
  ctx.fillRect(x, y - 1, 1, 3)
  ctx.fillStyle = petal === '#ffd23f' ? '#ffffff' : '#ffb000'
  ctx.fillRect(x, y, 1, 1)
}

// Collines, arbres, barrière, pelouse et fleurs (fond transparent).
export function drawGarden(ctx: Ctx, w: number, h: number) {
  const rand = seeded(42)
  const top = grassTop(h)

  // collines lointaines
  const hill = (x: number) =>
    Math.round(h * 0.5 + Math.sin(x / 23) * 5 + Math.sin(x / 9 + 2) * 1.5)
  for (let x = 0; x < w; x++) {
    const y = hill(x)
    ctx.fillStyle = '#7fcf6a'
    ctx.fillRect(x, y, 1, top - y + 1)
    ctx.fillStyle = '#a2e284'
    ctx.fillRect(x, y, 1, 1)
  }

  // arbres sur les collines
  for (let x = 6 + rand() * 12; x < w; x += 16 + rand() * 26) {
    const tx = Math.round(x)
    tree(ctx, tx, hill(tx) + 6, 4 + Math.floor(rand() * 3))
  }

  // pelouse avec des bandes de tonte
  for (let y = top; y < h; y++) {
    ctx.fillStyle = Math.floor((y - top) / 6) % 2 ? '#55aa45' : '#5db54c'
    ctx.fillRect(0, y, w, 1)
  }
  ctx.fillStyle = '#3f8f3a'
  ctx.fillRect(0, top, w, 1)

  // buissons au pied de la barrière
  for (let x = rand() * 20; x < w; x += 28 + rand() * 40) {
    disc(ctx, Math.round(x), top, 4, '#2f7d45')
    disc(ctx, Math.round(x) - 1, top - 1, 3, '#3d9a52')
  }

  // barrière blanche
  ctx.fillStyle = '#c9bfa9'
  ctx.fillRect(0, top - 5, w, 1)
  ctx.fillRect(0, top - 2, w, 1)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, top - 6, w, 1)
  ctx.fillRect(0, top - 3, w, 1)
  for (let x = 2; x < w; x += 9) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, top - 9, 2, 10)
    ctx.fillRect(x, top - 10, 1, 1)
    ctx.fillStyle = '#c9bfa9'
    ctx.fillRect(x + 1, top - 9, 1, 10)
  }

  // touffes d'herbe et fleurs
  const petals = ['#ff5d6c', '#ffd23f', '#ff9ad5', '#ffffff', '#b28dff']
  const area = w * (h - top)
  for (let i = 0; i < area * 0.006; i++) {
    const x = Math.floor(rand() * w)
    const y = top + 4 + Math.floor(rand() * (h - top - 6))
    if (rand() < 0.55) {
      ctx.fillStyle = '#3f8f3a'
      ctx.fillRect(x, y, 1, 1)
      ctx.fillRect(x + 2, y, 1, 1)
      ctx.fillRect(x + 1, y + 1, 1, 1)
    } else {
      flower(ctx, x, y, petals[Math.floor(rand() * petals.length)]!)
    }
  }
}
