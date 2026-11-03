// Fausse PokéAPI pour les tests E2E : l'API Hono l'interroge à la place de
// la vraie (POKEAPI_URL), les tests marchent donc sans Internet.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const POKEDEX = JSON.parse(
  readFileSync(new URL('./pokedex.json', import.meta.url), 'utf8'),
)
const port = Number(process.env.PORT ?? 4002)

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const parts = url.pathname.split('/').filter(Boolean) // api, v2, pokemon, :key

  if (url.pathname === '/health') return send(res, 200, { status: 'ok' })
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
  return found ? send(res, 200, found) : send(res, 404, 'Not Found')
}).listen(port, () => {
  process.stdout.write(`Fausse PokéAPI prête sur http://localhost:${port}\n`)
})
