// Construit le paquet AWS Lambda de l'API : un seul fichier JavaScript
// (dépendances comprises) et le certificat racine de Supabase.
//
//   dist-lambda/lambda/index.mjs          → gestionnaire « lambda/index.handler »
//   dist-lambda/db/supabase-root-2021-ca.crt
import { build } from 'esbuild'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = `${root}dist-lambda`

rmSync(out, { recursive: true, force: true })
mkdirSync(`${out}/db`, { recursive: true })

await build({
  entryPoints: [`${root}src/lambda.ts`],
  outfile: `${out}/lambda/index.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  sourcemap: false,
  // pg essaie de charger son module natif facultatif : on s'en passe
  external: ['pg-native'],
  // Certaines dépendances (pg) font des require() : on les rend possibles en ESM
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'warning',
})

// db.ts lit le certificat à côté du code : ../db/ depuis lambda/index.mjs
cpSync(
  `${root}db/supabase-root-2021-ca.crt`,
  `${out}/db/supabase-root-2021-ca.crt`,
)

console.info(`Paquet Lambda prêt dans ${out}`)
