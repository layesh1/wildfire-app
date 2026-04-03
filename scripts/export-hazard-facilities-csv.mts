/**
 * Regenerate data/hazard_facilities.csv from lib/hazard-facilities.ts
 *
 *   node --experimental-strip-types scripts/export-hazard-facilities-csv.mts
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { HAZARD_FACILITIES } from '../lib/hazard-facilities.ts'

function esc(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'data')
const outFile = path.join(outDir, 'hazard_facilities.csv')

const header = 'id,name,type,lat,lng,county,state,risk_note'
const lines = [header]
for (const f of HAZARD_FACILITIES) {
  lines.push(
    [
      esc(f.id),
      esc(f.name),
      esc(f.type),
      String(f.lat),
      String(f.lng),
      esc(f.county),
      esc(f.state),
      esc(f.riskNote),
    ].join(',')
  )
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `${lines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${outFile} (${HAZARD_FACILITIES.length} rows)`)
