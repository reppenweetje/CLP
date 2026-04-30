#!/usr/bin/env node
// content stylelint voor de chat copy
// scant src op verboden karakters die de no leestekens regel breken
// uitzondering chip labels mogen geen vraagteken
// run via npm run check-copy
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = 'src'
const SCAN_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx'])

// karakters die nooit in chat copy mogen voorkomen
const HARD_FORBIDDEN = [
  { ch: '·', name: 'interpunct' },
  { ch: '—', name: 'em-dash' },
  { ch: '–', name: 'en-dash' },
]

// patterns die per ongeluk verboden zijn maar OK in code zelf
// regels met deze patterns slaan we over
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//,          // single line comment
  /^\s*\/\*/,          // begin block comment
  /^\s*\*/,            // continuing block comment
  /^\s*import\s/,      // import statements
  /^\s*export\s/,      // export statements
  /from\s['"][^'"]+['"]/,  // from imports
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, files)
    else if (SCAN_EXTS.has(extname(full))) files.push(full)
  }
  return files
}

const violations = []
const files = walk(ROOT)

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (SKIP_LINE_PATTERNS.some((re) => re.test(line))) return
    for (const { ch, name } of HARD_FORBIDDEN) {
      if (line.includes(ch)) {
        violations.push({
          file,
          line: idx + 1,
          char: ch,
          name,
          snippet: line.trim().slice(0, 100),
        })
      }
    }
  })
}

if (violations.length === 0) {
  console.log('check-copy: alles schoon, geen verboden leestekens gevonden in', files.length, 'files')
  process.exit(0)
}

console.log('check-copy: gevonden', violations.length, 'overtredingen\n')
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  ${v.name} (${v.char})`)
  console.log(`     ${v.snippet}`)
}
console.log('\ngebruik spaties of het woord "en" als separator. zie CLAUDE.md voor de tone of voice regel.')
process.exit(1)
