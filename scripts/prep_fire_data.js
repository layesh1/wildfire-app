#!/usr/bin/env node
// Converts fire_events_with_svi_and_delays.csv → public/data/fire_events_map.json
// Run: node scripts/prep_fire_data.js

const fs = require('fs')
const path = require('path')

const CSV_PATH = path.resolve(__dirname, '../../widsdatathon/01_raw_data/processed/fire_events_with_svi_and_delays.csv')
const OUT_PATH = path.resolve(__dirname, '../public/data/fire_events_map.json')

const csv = fs.readFileSync(CSV_PATH, 'utf8')
const lines = csv.split('\n').filter(Boolean)
const headers = lines[0].split(',')

function col(row, name) {
  return row[headers.indexOf(name)]
}

const KEEP = ['geo_event_id', 'name', 'latitude', 'longitude', 'county_name', 'state', 'max_acres', 'svi_score', 'evacuation_occurred', 'hours_to_order']

let kept = 0, skipped = 0

const result = []

for (let i = 1; i < lines.length; i++) {
  const vals = lines[i].split(',')
  const lat = parseFloat(col(vals, 'latitude'))
  const lng = parseFloat(col(vals, 'longitude'))
  if (isNaN(lat) || isNaN(lng)) { skipped++; continue }

  const obj = {}
  for (const k of KEEP) {
    const v = col(vals, k)
    if (v === '' || v === undefined) { obj[k] = null; continue }
    if (k === 'latitude' || k === 'longitude' || k === 'svi_score' || k === 'max_acres' || k === 'hours_to_order') {
      obj[k] = parseFloat(v)
    } else if (k === 'evacuation_occurred') {
      obj[k] = v === '1' || v === 'true' || v === 'True'
    } else {
      obj[k] = v
    }
  }
  result.push(obj)
  kept++
}

fs.writeFileSync(OUT_PATH, JSON.stringify(result))
console.log(`Done: ${kept} fires with coordinates, ${skipped} skipped (no lat/lng)`)
console.log(`Output: ${OUT_PATH}`)
