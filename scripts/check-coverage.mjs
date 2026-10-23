import { readFile } from 'node:fs/promises'

const report = await readFile(new URL('../coverage/lcov.info', import.meta.url), 'utf8')
const files = new Map()
let current

for (const line of report.split(/\r?\n/)) {
  if (line.startsWith('SF:')) {
    current = { linesFound: 0, linesHit: 0 }
    files.set(line.slice(3), current)
  } else if (current && line.startsWith('LF:')) {
    current.linesFound = Number(line.slice(3))
  } else if (current && line.startsWith('LH:')) {
    current.linesHit = Number(line.slice(3))
  } else if (line === 'end_of_record') {
    current = undefined
  }
}

// One module per line so parallel feature branches merge without conflicts.
const targets = [
  'src/oauth.ts',
  'src/cimd.ts',
  'src/sealed.ts',
  'src/guards.ts',
  'src/tool-filter.ts',
  'src/virtual-tools.ts',
  'src/extensions.ts',
  'src/shaping.ts',
]
const sourceFiles = [...files].filter(([file]) => file.startsWith('src/') && file !== 'src/tools.ts')
if (sourceFiles.length === 0) throw new Error('coverage/lcov.info contains no eligible src/*.ts files')

const percent = ({ linesFound, linesHit }) => linesFound === 0 ? 0 : (100 * linesHit) / linesFound
const total = sourceFiles.reduce((sum, [, counts]) => ({
  linesFound: sum.linesFound + counts.linesFound,
  linesHit: sum.linesHit + counts.linesHit,
}), { linesFound: 0, linesHit: 0 })
const rows = [
  ['Global', total, 80],
  ...sourceFiles.map(([file, counts]) => [file, counts, targets.includes(file) ? 90 : undefined]),
]
for (const file of targets) {
  if (!files.has(file)) rows.push([file, { linesFound: 0, linesHit: 0 }, 90])
}

console.log('\nCoverage by source file (line coverage)')
console.log(`${'File'.padEnd(27)} ${'Lines'.padStart(11)} ${'Coverage'.padStart(10)} ${'Required'.padStart(10)}  Result`)
let failed = false
for (const [file, counts, threshold] of rows) {
  const rate = percent(counts)
  const requirement = threshold === undefined ? '—' : `${threshold}%`
  const passed = threshold === undefined || rate >= threshold
  failed ||= !passed
  console.log(`${String(file).padEnd(27)} ${`${counts.linesHit}/${counts.linesFound}`.padStart(11)} ${`${rate.toFixed(2)}%`.padStart(10)} ${requirement.padStart(10)}  ${passed ? 'PASS' : 'FAIL'}`)
}
if (failed) process.exitCode = 1
