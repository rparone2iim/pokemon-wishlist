// Rapport de couverture des tests Vitest, pour GitHub : un tableau Markdown
// (résumé du run et commentaire de PR) et un badge par app (format shields.io).
//
//   node scripts/coverage-report.mjs [dossier-des-badges]
//
// Lit apps/<app>/coverage/coverage-summary.json (npm run test:coverage).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

export const APPS = [
  { app: 'web', label: 'Front Nuxt (apps/web)' },
  { app: 'api', label: 'API Hono (apps/api)' },
]
const METRICS = ['lines', 'statements', 'functions', 'branches']

/** Couleur du badge selon le taux de lignes couvertes. */
export function color(pct) {
  if (pct >= 90) return 'brightgreen'
  if (pct >= 75) return 'green'
  if (pct >= 60) return 'yellowgreen'
  if (pct >= 40) return 'yellow'
  if (pct >= 20) return 'orange'
  return 'red'
}

/** Badge au format « endpoint » de shields.io. */
export function badge(app, total) {
  const pct = total.lines.pct
  return {
    schemaVersion: 1,
    label: `coverage ${app}`,
    message: `${pct.toFixed(1)}%`,
    color: color(pct),
  }
}

/** Tableau Markdown des taux de couverture, app par app. */
export function markdown(summaries, { sha, runUrl } = {}) {
  const lines = [
    '## Couverture des tests (Vitest)',
    '',
    '| App | Lignes | Instructions | Fonctions | Branches |',
    '| --- | ---: | ---: | ---: | ---: |',
  ]
  for (const { label, total } of summaries) {
    const cells = METRICS.map(
      (m) =>
        `${total[m].pct.toFixed(1)} % (${total[m].covered}/${total[m].total})`,
    )
    lines.push(`| ${label} | ${cells.join(' | ')} |`)
  }
  lines.push('')
  if (sha) lines.push(`Commit \`${sha.slice(0, 7)}\`.`)
  if (runUrl)
    lines.push(
      `Rapport HTML détaillé (fichier par fichier) : artefacts \`coverage-web\` et \`coverage-api\` du [run](${runUrl}).`,
    )
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const badgesDir = process.argv[2]
  const summaries = []
  for (const { app, label } of APPS) {
    const file = `apps/${app}/coverage/coverage-summary.json`
    if (!existsSync(file)) {
      console.error(
        `${file} manquant : lancer npm run test:coverage -w apps/${app}`,
      )
      process.exit(1)
    }
    summaries.push({ app, label, total: JSON.parse(readFileSync(file)).total })
  }
  const { GITHUB_SHA, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } =
    process.env
  const runUrl =
    GITHUB_RUN_ID &&
    `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  console.log(markdown(summaries, { sha: GITHUB_SHA, runUrl }))
  if (badgesDir) {
    mkdirSync(badgesDir, { recursive: true })
    for (const { app, total } of summaries)
      writeFileSync(
        `${badgesDir}/coverage-${app}.json`,
        `${JSON.stringify(badge(app, total))}\n`,
      )
  }
}
