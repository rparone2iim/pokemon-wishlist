// Tests du rapport de couverture : npm run test:scripts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { badge, color, markdown } from './coverage-report.mjs'

const metric = (covered, total) => ({
  covered,
  total,
  pct: (covered / total) * 100,
})
const total = {
  lines: metric(200, 222),
  statements: metric(226, 251),
  functions: metric(60, 68),
  branches: metric(115, 133),
}

test('le badge affiche le taux de lignes couvertes', () => {
  assert.deepEqual(badge('api', total), {
    schemaVersion: 1,
    label: 'coverage api',
    message: '90.1%',
    color: 'brightgreen',
  })
})

test('la couleur baisse avec la couverture', () => {
  assert.deepEqual([95, 80, 65, 45, 25, 5].map(color), [
    'brightgreen',
    'green',
    'yellowgreen',
    'yellow',
    'orange',
    'red',
  ])
})

test('le tableau donne chaque taux avec le détail couvert/total', () => {
  const md = markdown([{ label: 'API Hono', total }], { sha: 'abcdef1234' })
  assert.match(
    md,
    /\| API Hono \| 90\.1 % \(200\/222\) \| 90\.0 % \(226\/251\) \| 88\.2 % \(60\/68\) \| 86\.5 % \(115\/133\) \|/,
  )
  assert.match(md, /Commit `abcdef1`/)
})
