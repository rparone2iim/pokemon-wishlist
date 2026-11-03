// Tests du script de vérification des traductions : npm run test:scripts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareLocale, flatten, placeholders } from './check-locales.mjs'

const en = {
  wishlist: { add: '+ Add', full: 'Full ({max} max)' },
  toast: { added: '{name} joins!' },
}

test('aplatit les clés imbriquées', () => {
  assert.deepEqual(
    [...flatten(en).keys()],
    ['wishlist.add', 'wishlist.full', 'toast.added'],
  )
})

test('repère les paramètres d’un texte', () => {
  assert.deepEqual(placeholders('{name} a {count} ({max})'), [
    'count',
    'max',
    'name',
  ])
})

test('une langue complète ne pose aucun problème', () => {
  const fr = {
    wishlist: { add: '+ Ajouter', full: 'Pleine ({max} max)' },
    toast: { added: '{name} arrive !' },
  }
  assert.deepEqual(compareLocale(en, fr), [])
})

test('signale une clé manquante', () => {
  const fr = {
    wishlist: { add: '+ Ajouter' },
    toast: { added: '{name} arrive !' },
  }
  assert.deepEqual(compareLocale(en, fr), ['clé manquante : wishlist.full'])
})

test('signale une clé en trop, une traduction vide et un paramètre faux', () => {
  const fr = {
    wishlist: { add: ' ', full: 'Pleine ({maximum} max)', extra: 'x' },
    toast: { added: 42 },
  }
  assert.deepEqual(compareLocale(en, fr), [
    'wishlist.add : traduction vide',
    'wishlist.full : paramètres {maximum} au lieu de {max} (comme en.json)',
    'toast.added : du texte est attendu, pas 42',
    'clé en trop (absente de en.json) : wishlist.extra',
  ])
})

test('un objet à la place d’un texte : clé manquante et clé en trop', () => {
  const fr = {
    wishlist: { add: '+ Ajouter', full: 'Pleine ({max} max)' },
    toast: { added: { name: 'oups' } },
  }
  assert.deepEqual(compareLocale(en, fr), [
    'clé manquante : toast.added',
    'clé en trop (absente de en.json) : toast.added.name',
  ])
})
