<script setup lang="ts">
// Pokéball dessinée pixel par pixel (X = contour, R = rouge, W = blanc)
const rows = [
  '....XXXX....',
  '..XXRRRRXX..',
  '.XRRRRRRWRX.',
  '.XRRRRRRRRX.',
  'XRRRRXXRRRRX',
  'XXXXXWWXXXXX',
  'XXXXXWWXXXXX',
  'XWWWWXXWWWWX',
  '.XWWWWWWWWX.',
  '.XWWWWWWWWX.',
  '..XXWWWWXX..',
  '....XXXX....',
]
const colors: Record<string, string> = {
  X: 'var(--color-ink)',
  R: 'var(--color-red)',
  W: '#fff',
}
const pixels = rows.flatMap((row, y) =>
  [...row].flatMap((c, x) => (colors[c] ? [{ x, y, fill: colors[c] }] : [])),
)
</script>

<template>
  <svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">
    <rect
      v-for="p in pixels"
      :key="`${p.x}-${p.y}`"
      :x="p.x"
      :y="p.y"
      width="1"
      height="1"
      :fill="p.fill"
    />
  </svg>
</template>
