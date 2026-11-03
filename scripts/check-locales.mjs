#!/usr/bin/env node
// Vérifie les traductions : chaque fichier de langue doit avoir exactement
// les clés de en.json (la référence), côté front et côté back.
//
//   node scripts/check-locales.mjs        (npm run i18n:check)
//
// Sort en erreur (code 1) s'il manque une clé, s'il y en a une en trop, si une
// valeur est vide ou n'a pas le bon type, ou si un paramètre {…} ne correspond pas.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Les dossiers de traductions du monorepo. */
export const LOCALE_DIRS = ['apps/web/i18n/locales', 'apps/api/src/locales']
export const REFERENCE = 'en.json'

/** Aplatit un objet de traductions : { a: { b: 'x' } } → Map { 'a.b' => 'x' }. */
export function flatten(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object' && !Array.isArray(child))
      flatten(child, path, out)
    else out.set(path, child)
  }
  return out
}

/** Les paramètres d'un texte : 'Salut {name} ({max})' → ['max', 'name']. */
export function placeholders(text) {
  return [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

/** Compare une langue à la référence (deux objets JSON déjà lus). */
export function compareLocale(reference, locale) {
  const ref = flatten(reference)
  const other = flatten(locale)
  const problems = []

  for (const [key, refValue] of ref) {
    if (!other.has(key)) {
      problems.push(`clé manquante : ${key}`)
      continue
    }
    const value = other.get(key)
    if (typeof value !== 'string') {
      problems.push(
        `${key} : du texte est attendu, pas ${JSON.stringify(value)}`,
      )
      continue
    }
    if (!value.trim()) problems.push(`${key} : traduction vide`)
    const expected = placeholders(refValue).join(', ')
    const actual = placeholders(value).join(', ')
    if (expected !== actual)
      problems.push(
        `${key} : paramètres {${actual}} au lieu de {${expected}} (comme en.json)`,
      )
  }
  for (const key of other.keys())
    if (!ref.has(key))
      problems.push(`clé en trop (absente de en.json) : ${key}`)

  return problems
}

/** Vérifie un dossier : chaque *.json comparé à en.json. */
export function checkDirectory(dir) {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
  const read = (file) => JSON.parse(readFileSync(join(dir, file), 'utf8'))
  if (!files.includes(REFERENCE))
    return {
      files,
      results: [{ file: REFERENCE, problems: ['fichier de référence absent'] }],
    }

  const reference = read(REFERENCE)
  const results = files
    .filter((file) => file !== REFERENCE)
    .map((file) => {
      try {
        return { file, problems: compareLocale(reference, read(file)) }
      } catch (error) {
        return { file, problems: [`JSON illisible : ${error.message}`] }
      }
    })
  return { files, keys: flatten(reference).size, results }
}

function main() {
  let failed = false
  for (const dir of LOCALE_DIRS) {
    const { keys, results } = checkDirectory(join(ROOT, dir))
    for (const { file, problems } of results) {
      if (problems.length === 0) {
        console.log(`✔ ${dir}/${file} : les ${keys} clés de en.json`)
        continue
      }
      failed = true
      console.error(`✘ ${dir}/${file} : ${problems.length} problème(s)`)
      for (const problem of problems) console.error(`    - ${problem}`)
    }
  }
  if (failed) {
    console.error(
      '\nTraductions incomplètes : complète les fichiers ci-dessus.',
    )
    process.exit(1)
  }
  console.log('\nToutes les traductions sont complètes.')
}

// Lancé directement (et pas importé par les tests)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
