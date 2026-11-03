<script setup lang="ts">
import type { Cloud } from '~/utils/garden'
import {
  PX,
  drawCloud,
  drawGarden,
  drawSky,
  makeClouds,
  seeded,
} from '~/utils/garden'

interface Walker {
  id: number
  x: number
  lane: number
  dir: 1 | -1
  speed: number
  pause: number
  hop: boolean
}

// Pokémon qui se baladent par défaut (complétés par ceux de la wishlist)
const DEFAULT_IDS = [25, 1, 133, 7, 4, 39, 54, 43]
const ANIMATED_MAX_ID = 649 // sprites animés disponibles jusqu'à la 5e génération

const { wishlist } = useWishlist()

const root = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const walkers = ref<Walker[]>([])

let sky: HTMLCanvasElement | undefined
let garden: HTMLCanvasElement | undefined
let clouds: Cloud[] = []
let size = { w: 0, h: 0 }
let cloudTimer: ReturnType<typeof setInterval> | undefined
let walkTimer: ReturnType<typeof setInterval> | undefined
let reducedMotion = false
const rand = seeded(Date.now())

function sprite(id: number) {
  const base =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
  return id <= ANIMATED_MAX_ID
    ? `${base}/versions/generation-v/black-white/animated/${id}.gif`
    : `${base}/${id}.png`
}

function onSpriteError(event: Event, id: number) {
  const img = event.target as HTMLImageElement
  const fallback = spriteUrl(id)
  if (img.src !== fallback) img.src = fallback
}

function layer(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (ctx) draw(ctx)
  return c
}

function render() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !sky || !garden) return
  ctx.drawImage(sky, 0, 0)
  for (const c of clouds) drawCloud(ctx, c)
  ctx.drawImage(garden, 0, 0)
}

function resize() {
  if (!root.value || !canvas.value) return
  const w = Math.ceil(root.value.clientWidth / PX)
  const h = Math.ceil(root.value.clientHeight / PX)
  if (w === size.w && h === size.h) return
  size = { w, h }
  canvas.value.width = w
  canvas.value.height = h
  canvas.value.style.width = `${w * PX}px`
  canvas.value.style.height = `${h * PX}px`
  sky = layer(w, h, (ctx) => drawSky(ctx, w, h))
  garden = layer(w, h, (ctx) => drawGarden(ctx, w, h))
  clouds = makeClouds(w, h)
  render()
  const maxX = root.value.clientWidth - 60
  for (const p of walkers.value) p.x = Math.min(p.x, maxX)
}

function animateClouds() {
  for (const c of clouds) {
    c.x += c.speed
    if (c.x > size.w + 10) c.x = -c.size * 4
  }
  render()
}

function spawnWalkers() {
  const width = root.value?.clientWidth ?? 0
  const count = width < 640 ? 4 : 7
  const ids = [
    ...new Set([...wishlist.value.map((p) => p.id), ...DEFAULT_IDS]),
  ].slice(0, count)
  walkers.value = ids.map((id, i) => ({
    id,
    x: Math.round((rand() * (width - 80)) / PX) * PX,
    // chaque Pokémon a son « couloir » sur la pelouse
    lane: 4 + (i * 24) / Math.max(1, ids.length - 1),
    dir: rand() < 0.5 ? 1 : -1,
    speed: 1 + Math.floor(rand() * 2),
    pause: 0,
    hop: false,
  }))
}

// Déplacement saccadé, case par case, pour rester dans l'esprit 8 bits
function walk() {
  const maxX = (root.value?.clientWidth ?? 0) - 60
  for (const p of walkers.value) {
    if (p.pause > 0) {
      p.pause--
      p.hop = p.pause % 4 < 2
      continue
    }
    p.hop = false
    p.x += p.dir * p.speed * PX
    if (p.x < 0 || p.x > maxX) {
      p.dir = p.dir === 1 ? -1 : 1
      p.x = Math.max(0, Math.min(p.x, maxX))
    }
    if (rand() < 0.02) p.pause = 8 + Math.floor(rand() * 20)
    else if (rand() < 0.01) p.dir = p.dir === 1 ? -1 : 1
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  spawnWalkers()
  window.addEventListener('resize', resize)
  if (!reducedMotion) {
    cloudTimer = setInterval(animateClouds, 100)
    walkTimer = setInterval(walk, 110)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  clearInterval(cloudTimer)
  clearInterval(walkTimer)
})
</script>

<template>
  <div
    ref="root"
    class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    aria-hidden="true"
  >
    <canvas ref="canvas" class="block [image-rendering:pixelated]" />
    <div
      v-for="p in walkers"
      :key="p.id"
      class="absolute"
      :style="{
        left: `${p.x}px`,
        bottom: `${p.lane}%`,
        zIndex: 100 - Math.round(p.lane),
      }"
    >
      <svg
        class="absolute -bottom-1 left-1/2 h-3 w-10 -translate-x-1/2"
        viewBox="0 0 10 3"
        shape-rendering="crispEdges"
      >
        <path d="M2 0h6v1h2v1H8v1H2V2H0V1h2z" fill="rgb(0 0 0 / 0.2)" />
      </svg>
      <img
        :src="sprite(p.id)"
        alt=""
        class="relative block max-w-none origin-bottom"
        :style="{
          transform: `scale(${p.dir === 1 ? -2 : 2}, 2) translateY(${p.hop ? -2 : 0}px)`,
        }"
        @error="onSpriteError($event, p.id)"
      />
    </div>
  </div>
</template>
