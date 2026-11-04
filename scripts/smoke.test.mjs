// Tests des smoke tests de la production : npm run test:scripts
// Un faux site local joue la production, en bon état ou cassée.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { productionChecks, runCheck, runChecks } from './smoke.mjs'

const VERSION = 'abc1234'
const meta = `<meta name="app-version" content="${VERSION}">`
const page = (title, body) =>
  `<html><head><title>${title}</title>${meta}<script type="module" src="/_nuxt/entry.js"></script></head><body>${body}</body></html>`

/** Pages du faux site ; un test peut en casser une. */
let routes
const healthy = () => ({
  '/api/health': [200, `{"status":"ok","version":"${VERSION}"}`],
  '/api/wishlist': [200, '[]'],
  '/web/': [200, page('PokéWishlist', '<a href="/wishlist">Start</a>')],
  '/web/wishlist': [200, page('My wishlist', '<h2 id="wishlist-title">')],
  '/web/pokemon/pikachu': [200, page('Pikachu', '<h1 id="fiche-25">Pikachu')],
  '/web/_nuxt/entry.js': [200, 'export {}'],
  '/_nuxt/entry.js': [200, 'export {}'],
})

let server, base
before(async () => {
  server = createServer((req, res) => {
    const [status, body] = routes[req.url] ?? [404, 'not found']
    res.writeHead(status).end(body)
  })
  await new Promise((resolve) => server.listen(0, resolve))
  base = `http://localhost:${server.address().port}`
})
after(() => server.close())

const checks = () =>
  productionChecks({
    API_URL: `${base}/api`,
    SSR_URL: `${base}/web`,
    EXPECTED_VERSION: VERSION,
  })
const run = async () => {
  const lines = []
  const ok = await runChecks(checks(), {
    retries: 0,
    log: (l) => lines.push(l),
  })
  return { ok, lines }
}

test('une production en bon état : tout est vert', async () => {
  routes = healthy()
  const { ok, lines } = await run()
  assert.equal(ok, true, lines.join('\n'))
  assert.ok(lines.every((l) => l.startsWith('✔')))
})

test('l’API ne répond plus : rouge', async () => {
  routes = healthy()
  routes['/api/health'] = [502, '{"message":"Internal Server Error"}']
  const { ok, lines } = await run()
  assert.equal(ok, false)
  assert.ok(lines.includes('    HTTP 502 au lieu de 200'))
})

test('l’ancienne version est encore en ligne : rouge', async () => {
  routes = healthy()
  routes['/api/health'] = [200, '{"status":"ok","version":"0000000"}']
  const { ok } = await run()
  assert.equal(ok, false)
})

test('une page servie en coquille vide (sans contenu) : rouge', async () => {
  routes = healthy()
  routes['/web/pokemon/pikachu'] = [200, page('PokéWishlist', '')]
  const { ok, lines } = await run()
  assert.equal(ok, false)
  assert.ok(lines.some((l) => l.includes('<h1 id="fiche-25"')))
})

test('les fichiers JS du build manquent : rouge', async () => {
  routes = healthy()
  delete routes['/_nuxt/entry.js']
  const problems = await runCheck(checks().find((c) => c.asset))
  assert.deepEqual(problems, ['/_nuxt/entry.js : HTTP 404'])
})

test('un site injoignable : rouge, sans planter', async () => {
  const problems = await runCheck({
    name: 'injoignable',
    url: 'http://localhost:1/health',
    status: 200,
  })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^ne répond pas/)
})

test('accepte le SHA complet du commit (github.sha)', async () => {
  routes = healthy()
  const lines = []
  const ok = await runChecks(
    productionChecks({
      API_URL: `${base}/api`,
      EXPECTED_VERSION: `${VERSION}${'0'.repeat(33)}`,
    }),
    { retries: 0, log: (l) => lines.push(l) },
  )
  assert.equal(ok, true, lines.join('\n'))
})

test('le SSR doit renvoyer un vrai 404 pour un Pokémon inconnu', () => {
  const ssr = productionChecks({ SSR_URL: 'https://ssr' })
  const ssg = productionChecks({ SSG_URL: 'https://ssg' })
  assert.ok(ssr.some((c) => c.status === 404))
  // Le SSG sert sa page de secours en 200 : pas de contrôle 404
  assert.ok(ssg.every((c) => c.status === 200))
})
