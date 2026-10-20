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

// KaTeX (script, stylesheet and font faces) is for statements only: it loads with the problem page, never with a first paint.
let heavy = false
let total = 0
for (const key of closure) {
  const file = manifest[key].file
  for (const css of manifest[key].css ?? []) {
    if (readFileSync(join(DIST, css), 'utf8').includes('KaTeX_')) {
      console.error(`  ${css} is in the /problems closure and carries the KaTeX font faces`)
      heavy = true
    }
  }
  if (!file.endsWith('.js')) continue
  if (readFileSync(join(DIST, file), 'utf8').includes('katex-error')) {
    console.error(`  ${file} is in the /problems closure and contains KaTeX`)
    heavy = true
  }
  const size = gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length
  total += size
  console.log(`  ${file}: ${size}`)
}

console.log(`initial JS for /problems: ${total} bytes gzip (budget ${BUDGET})`)
if (heavy) console.error('KaTeX must stay out of the /problems initial closure (lazy-load RichContent).')
if (total > BUDGET || heavy) process.exit(1)
