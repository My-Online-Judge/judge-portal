// The initial JS of /problems: the static-import closure of the index.html entry plus the problem list's route chunk,
// gzipped at level 9. Run after `npm run build-only`; exits 1 above the budget.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET = 409600
const DIST = join(import.meta.dirname, '..', 'dist')
const ROOTS = ['index.html', 'src/pages/user/problem/ProblemListPage.vue']

const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'))

const closure = new Set()
const visit = (key) => {
  if (closure.has(key)) return
  const chunk = manifest[key]
  if (!chunk) throw new Error(`${key} is not in dist/.vite/manifest.json`)
  closure.add(key)
  for (const dep of chunk.imports ?? []) visit(dep)
}
ROOTS.forEach(visit)

let total = 0
for (const key of closure) {
  const file = manifest[key].file
  if (!file.endsWith('.js')) continue
  const size = gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length
  total += size
  console.log(`  ${file}: ${size}`)
}

console.log(`initial JS for /problems: ${total} bytes gzip (budget ${BUDGET})`)
if (total > BUDGET) process.exit(1)
