// Smoke tests de la production, lancés par la CD juste après les déploiements :
// l'API (Lambda), le front SSR (Vercel) et le front SSG (S3 + CloudFront)
// répondent-ils, avec les bons codes HTTP et le bon contenu ?
//
//   API_URL=… SSR_URL=… SSG_URL=… [EXPECTED_VERSION=abc1234] node scripts/smoke.mjs
//
// Code de sortie 1 dès qu'une URL critique ne répond pas comme prévu :
// le job passe au rouge, la CD échoue.

/**
 * @typedef {object} Check
 * @property {string} name      ce qui est vérifié
 * @property {string} url
 * @property {number} status    code HTTP attendu
 * @property {(string|RegExp)[]} [contains]  textes attendus dans la réponse
 * @property {boolean} [asset]  vérifier aussi le 1er script /_nuxt/*.js de la page
 */

/** Les vérifications de la production, à partir des adresses déployées. */
export function productionChecks({
  API_URL,
  SSR_URL,
  SSG_URL,
  EXPECTED_VERSION: sha,
}) {
  // Les sites affichent le commit sur 7 caractères (GITHUB_SHA tronqué)
  const EXPECTED_VERSION = sha?.slice(0, 7)
  const version = EXPECTED_VERSION
    ? [`<meta name="app-version" content="${EXPECTED_VERSION}">`]
    : []
  /** @type {Check[]} */
  const checks = []
  if (API_URL)
    checks.push(
      {
        name: 'API · /health',
        url: `${API_URL}/health`,
        status: 200,
        contains: [
          '"status":"ok"',
          ...(EXPECTED_VERSION ? [`"version":"${EXPECTED_VERSION}"`] : []),
        ],
      },
      {
        name: 'API · /wishlist (base Supabase)',
        url: `${API_URL}/wishlist`,
        status: 200,
        contains: [/^\[/],
      },
      {
        name: 'API · route inconnue',
        url: `${API_URL}/route-inconnue`,
        status: 404,
      },
    )
  for (const [mode, base] of [
    ['SSR', SSR_URL],
    ['SSG', SSG_URL],
  ]) {
    if (!base) continue
    checks.push(
      {
        name: `${mode} · accueil`,
        url: `${base}/`,
        status: 200,
        // Le lien « Commencer » : absent de la page de secours (coquille vide)
        contains: ['href="/wishlist"', ...version],
        asset: true,
      },
      {
        name: `${mode} · /wishlist`,
        url: `${base}/wishlist`,
        status: 200,
        contains: ['id="wishlist-title"', ...version],
      },
      {
        name: `${mode} · fiche /pokemon/pikachu`,
        url: `${base}/pokemon/pikachu`,
        status: 200,
        contains: ['<h1 id="fiche-25"', '<title>Pikachu', ...version],
        asset: true,
      },
    )
  }
  // Seul le SSR répond un vrai 404 : le SSG sert sa page de secours (200)
  if (SSR_URL)
    checks.push({
      name: 'SSR · Pokémon introuvable',
      url: `${SSR_URL}/pokemon/pokemon-inconnu`,
      status: 404,
    })
  return checks
}

const firstScript = (html) => html.match(/src="(\/_nuxt\/[^"]+\.js)"/)?.[1]

/**
 * Une vérification. Renvoie la liste des problèmes (vide si tout va bien).
 * @param {Check} check
 */
export async function runCheck(check, { fetch = globalThis.fetch } = {}) {
  let res
  try {
    res = await fetch(check.url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    return [`ne répond pas (${error.cause?.code ?? error.name})`]
  }
  const body = await res.text()
  const problems = []
  if (res.status !== check.status)
    problems.push(`HTTP ${res.status} au lieu de ${check.status}`)
  for (const expected of check.contains ?? []) {
    const found =
      expected instanceof RegExp ? expected.test(body) : body.includes(expected)
    if (!found) problems.push(`contenu attendu absent : ${expected}`)
  }
  if (check.asset && res.ok) {
    const script = firstScript(body)
    if (!script) problems.push('aucun script /_nuxt/*.js dans la page')
    else {
      const asset = await fetch(new URL(script, check.url)).catch(() => null)
      if (asset?.status !== 200)
        problems.push(`${script} : HTTP ${asset?.status ?? 'injoignable'}`)
    }
  }
  return problems
}

/**
 * Lance toutes les vérifications, en réessayant chacune (le temps qu'un
 * déploiement se propage). Renvoie true si tout est vert.
 */
export async function runChecks(
  checks,
  { retries = 5, delay = 3000, log = console.log, ...options } = {},
) {
  let ok = true
  for (const check of checks) {
    let problems = []
    for (let attempt = 0; attempt <= retries; attempt++) {
      problems = await runCheck(check, options)
      if (!problems.length) break
      if (attempt < retries) await new Promise((r) => setTimeout(r, delay))
    }
    if (problems.length) {
      ok = false
      log(`✘ ${check.name} — ${check.url}`)
      for (const problem of problems) log(`    ${problem}`)
    } else log(`✔ ${check.name} — HTTP ${check.status}`)
  }
  return ok
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const checks = productionChecks(process.env)
  if (!checks.length) {
    console.error('Aucune adresse : API_URL, SSR_URL ou SSG_URL')
    process.exit(1)
  }
  const ok = await runChecks(checks, {
    retries: Number(process.env.SMOKE_RETRIES ?? 5),
  })
  console.log(
    ok
      ? `\n${checks.length} vérifications vertes`
      : '\nSmoke tests en échec : la production ne répond pas comme prévu',
  )
  process.exit(ok ? 0 : 1)
}
