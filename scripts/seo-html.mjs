// SEO : ce qu'un robot voit SANS exécuter JavaScript. On récupère le HTML de
// fiches Pokémon par une simple requête HTTP, en SSR (Vercel) et en SSG
// (S3 + CloudFront), et on vérifie le <title> et le contenu de la page.
//
//   SSR_URL=… SSG_URL=… node scripts/seo-html.mjs
//
// Code de sortie 1 si une fiche qui doit être indexable est une coquille vide.

/** Fiches comparées : `prerendered` = générée au build (les 151 premières). */
export const PAGES = [
  { slug: 'bulbasaur', id: 1, name: 'Bulbasaur', prerendered: true },
  { slug: 'pikachu', id: 25, name: 'Pikachu', prerendered: true },
  { slug: 'mewtwo', id: 150, name: 'Mewtwo', prerendered: true },
  // n° 152 : pas prégénérée, le SSG ne peut servir que sa page de secours
  { slug: 'chikorita', id: 152, name: 'Chikorita', prerendered: false },
]

const decode = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

/** Le texte visible d'un HTML (sans scripts, styles ni balises). */
export function visibleText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
  return decode(
    body
      .replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ce que le HTML brut d'une fiche contient, et ce qui lui manque. */
export function analyzeFiche(html, { id, name }) {
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
  const h1 = decode(
    html.match(new RegExp(`<h1 id="fiche-${id}"[^>]*>([^<]*)<`))?.[1] ?? '',
  ).trim()
  const description = decode(
    html.match(/<p class="dialog">([^<]*)<\/p>/)?.[1] ?? '',
  ).trim()
  const stats = (html.match(/role="meter"/g) ?? []).length
  const words = visibleText(html).split(' ').filter(Boolean).length

  const problems = []
  if (title !== `${name} · PokéWishlist`)
    problems.push(`<title> « ${title} » au lieu de « ${name} · PokéWishlist »`)
  if (h1 !== name) problems.push(`<h1> du Pokémon absent`)
  if (!description) problems.push('description absente')
  if (stats !== 6) problems.push(`${stats} stats sur 6`)
  if (words < 40) problems.push(`${words} mots visibles : coquille vide`)
  return { title, h1, description, stats, words, bytes: html.length, problems }
}

async function fetchHtml(url) {
  // Comme un robot : pas de JavaScript, pas de cookie, une langue par défaut
  const res = await fetch(url, { headers: { 'user-agent': 'seo-html-check' } })
  return { status: res.status, html: await res.text() }
}

/** Compare SSR et SSG fiche par fiche. Renvoie les lignes du rapport et ok. */
export async function compare({ SSR_URL, SSG_URL }, pages = PAGES) {
  const rows = []
  let ok = true
  for (const pageInfo of pages) {
    for (const [mode, base] of [
      ['SSR', SSR_URL],
      ['SSG', SSG_URL],
    ]) {
      if (!base) continue
      const url = `${base}/pokemon/${pageInfo.slug}`
      const { status, html } = await fetchHtml(url)
      const result = analyzeFiche(html, pageInfo)
      if (status !== 200) result.problems.unshift(`HTTP ${status}`)
      // Le SSG ne connaît que les fiches générées au build : pour les autres,
      // une coquille est attendue (limite du SSG), pas une erreur
      const expected = mode === 'SSR' || pageInfo.prerendered
      const indexable = result.problems.length === 0
      if (expected && !indexable) ok = false
      rows.push({ mode, url, status, expected, indexable, ...result })
    }
  }
  return { ok, rows }
}

export function report(rows) {
  const lines = [
    'Mode  Fiche                Octets  Mots  <title>                           Verdict',
  ]
  for (const r of rows) {
    const verdict = r.indexable
      ? '✔ HTML complet'
      : r.expected
        ? `✘ ${r.problems.join(', ')}`
        : `— coquille (attendu : non prégénérée)`
    lines.push(
      [
        r.mode.padEnd(5),
        r.url.replace(/^https?:\/\/[^/]+/, '').padEnd(20),
        String(r.bytes).padStart(6),
        String(r.words).padStart(5),
        ` ${(r.title || '(vide)').padEnd(33)}`,
        verdict,
      ].join(' '),
    )
  }
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { SSR_URL, SSG_URL } = process.env
  if (!SSR_URL && !SSG_URL) {
    console.error('Aucune adresse : SSR_URL ou SSG_URL')
    process.exit(1)
  }
  const { ok, rows } = await compare({ SSR_URL, SSG_URL })
  console.log(report(rows))
  console.log(
    ok
      ? '\nToutes les fiches attendues sont lisibles sans JavaScript'
      : '\nUne fiche attendue est une coquille vide pour les robots',
  )
  process.exit(ok ? 0 : 1)
}
