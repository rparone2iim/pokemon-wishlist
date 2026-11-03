// Fausse PokéAPI pour les tests E2E : l'API Hono l'interroge à la place de
// la vraie (POKEAPI_URL), les tests marchent donc sans Internet.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const POKEDEX = JSON.parse(
  readFileSync(new URL('./pokedex.json', import.meta.url), 'utf8'),
)
const port = Number(process.env.PORT ?? 4002)

/** Réponse façon PokéAPI pour /pokemon/{nom} (mêmes valeurs pour tous). */
function pokemon(p) {
  return {
    id: p.id,
    name: p.name,
    height: 4,
    weight: 60,
    species: { name: p.name },
    types: p.types.map((name, i) => ({ slot: i + 1, type: { name } })),
    abilities: [
      { is_hidden: false, ability: { name: 'static' } },
      { is_hidden: true, ability: { name: 'lightning-rod' } },
    ],
    stats: [
      ['hp', 35],
      ['attack', 55],
      ['defense', 40],
      ['special-attack', 50],
      ['special-defense', 50],
      ['speed', 90],
    ].map(([name, base_stat]) => ({ base_stat, stat: { name } })),
  }
}

/** Réponse façon PokéAPI pour /pokemon-species/{nom}, dans les 4 langues. */
function species(p) {
  const en = p.name.charAt(0).toUpperCase() + p.name.slice(1)
  const texts = {
    en: [en, 'Test Pokémon', `Test entry\nfor ${en}.`],
    fr: [p.fr, 'Pokémon Test', `Fiche de test\nde ${p.fr}.`],
    es: [en, 'Pokémon Prueba', `Ficha de prueba\nde ${en}.`],
    de: [en, 'Test-Pokémon', `Testeintrag\nfür ${en}.`],
  }
  const entries = Object.entries(texts)
  return {
    names: entries.map(([lang, [name]]) => ({
      name,
      language: { name: lang },
    })),
    genera: entries.map(([lang, [, genus]]) => ({
      genus,
      language: { name: lang },
    })),
    flavor_text_entries: entries.map(([lang, [, , flavor_text]]) => ({
      flavor_text,
      language: { name: lang },
    })),
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const parts = url.pathname.split('/').filter(Boolean) // api, v2, pokemon, :key

  if (url.pathname === '/health') return send(res, 200, { status: 'ok' })

  // Espèce : nom français, catégorie et description
  if (parts[2] === 'pokemon-species' && parts.length === 4) {
    const found = POKEDEX.find((p) => p.name === parts[3])
    return found ? send(res, 200, species(found)) : send(res, 404, 'Not Found')
  }
  if (parts[2] !== 'pokemon') return send(res, 404, 'Not Found')

  if (parts.length === 3) {
    return send(res, 200, {
      count: POKEDEX.length,
      results: POKEDEX.map((p) => ({
        name: p.name,
        url: `http://localhost:${port}/api/v2/pokemon/${p.id}/`,
      })),
    })
  }
  const key = parts[3]
  const found = POKEDEX.find((p) => p.name === key || String(p.id) === key)
  return found ? send(res, 200, pokemon(found)) : send(res, 404, 'Not Found')
}).listen(port, () => {
  process.stdout.write(`Fausse PokéAPI prête sur http://localhost:${port}\n`)
})
