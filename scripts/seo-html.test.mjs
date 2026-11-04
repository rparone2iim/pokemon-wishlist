// Tests de la comparaison SEO SSR / SSG : npm run test:scripts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeFiche, visibleText } from './seo-html.mjs'

const pikachu = { id: 25, name: 'Pikachu' }
const meters = '<span role="meter"></span>'.repeat(6)
const words = 'Possesses cheek sacs in which it stores electricity. '.repeat(6)
const fiche = `<!DOCTYPE html><html><head><title>Pikachu · PokéWishlist</title>
<script>window.__NUXT__={}</script></head><body><div id="__nuxt">
<article><h1 id="fiche-25" class="uppercase">Pikachu</h1>
<p class="dialog">${words}</p>${meters}</article></div>
<script type="application/json">["beaucoup","de","mots","cachés"]</script></body></html>`
// La page de secours du SSG : le contenu n'arrive qu'avec JavaScript
const coquille = `<!DOCTYPE html><html><head><title>PokéWishlist</title></head>
<body><div id="__nuxt"></div><script>window.__NUXT__={}</script></body></html>`

test('une fiche rendue côté serveur est lisible sans JavaScript', () => {
  const r = analyzeFiche(fiche, pikachu)
  assert.deepEqual(r.problems, [])
  assert.equal(r.title, 'Pikachu · PokéWishlist')
  assert.equal(r.h1, 'Pikachu')
  assert.equal(r.stats, 6)
})

test('une coquille HTML vide est repérée', () => {
  const r = analyzeFiche(coquille, pikachu)
  assert.equal(r.words, 0)
  assert.deepEqual(r.problems, [
    '<title> « PokéWishlist » au lieu de « Pikachu · PokéWishlist »',
    '<h1> du Pokémon absent',
    'description absente',
    '0 stats sur 6',
    '0 mots visibles : coquille vide',
  ])
})

test('le texte des scripts ne compte pas comme du contenu', () => {
  assert.ok(!visibleText(fiche).includes('cachés'))
  assert.ok(!visibleText(fiche).includes('__NUXT__'))
})

test('un <title> générique suffit à signaler la fiche', () => {
  const r = analyzeFiche(fiche.replace('Pikachu · ', ''), pikachu)
  assert.equal(r.problems.length, 1)
})
