import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @typedef {{ sn: number; polling_station: string; sub_loc: string | null; loc: string | null; ward: string | null }} PollingRow */

/** @returns {PollingRow[]} */
function loadRows() {
  const jsonPath = path.join(__dirname, '../data/funyula-polling-stations.json')
  const raw = readFileSync(jsonPath, 'utf8')
  return JSON.parse(raw)
}

const POLLING_ROWS = loadRows()

/** Normalize for comparison (null/undefined → ''). */
export function normGeoPart(value) {
  if (value == null || typeof value !== 'string') return ''
  return value.trim()
}

/**
 * Application-level "enum" sets derived from the catalog (Prisma enums are impractical for this many values).
 */
function buildSets() {
  const wards = new Set()
  const locations = new Set()
  const subLocations = new Set()
  const pollingStations = new Set()

  for (const r of POLLING_ROWS) {
    wards.add(normGeoPart(r.ward))
    locations.add(normGeoPart(r.loc))
    subLocations.add(normGeoPart(r.sub_loc))
    pollingStations.add(normGeoPart(r.polling_station))
  }

  return {
    WARDS: Object.freeze([...wards].filter(Boolean).sort()),
    LOCATIONS: Object.freeze([...locations].filter(Boolean).sort()),
    SUB_LOCATIONS: Object.freeze([...subLocations].filter(Boolean).sort()),
    POLLING_STATIONS: Object.freeze([...pollingStations].sort()),
  }
}

const sets = buildSets()

export const VOLUNTEER_WARDS = sets.WARDS
export const VOLUNTEER_LOCATIONS = sets.LOCATIONS
export const VOLUNTEER_SUB_LOCATIONS = sets.SUB_LOCATIONS
export const VOLUNTEER_POLLING_STATIONS = sets.POLLING_STATIONS

/**
 * @param {string} ward
 * @param {string} location
 * @param {string} subLocation
 * @param {string} pollingStation
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateVolunteerPollingSelection(ward, location, subLocation, pollingStation) {
  const w = normGeoPart(ward)
  const l = normGeoPart(location)
  const s = normGeoPart(subLocation)
  const p = normGeoPart(pollingStation)

  if (!w) return { ok: false, message: 'ward is required' }
  if (!VOLUNTEER_WARDS.includes(w)) return { ok: false, message: 'Invalid ward' }
  if (!VOLUNTEER_LOCATIONS.includes(l) && l !== '') return { ok: false, message: 'Invalid location' }
  if (!VOLUNTEER_SUB_LOCATIONS.includes(s) && s !== '') return { ok: false, message: 'Invalid sub location' }
  if (!p || !VOLUNTEER_POLLING_STATIONS.includes(p)) return { ok: false, message: 'Invalid polling station' }

  const match = POLLING_ROWS.some(
    (r) =>
      normGeoPart(r.ward) === w &&
      normGeoPart(r.loc) === l &&
      normGeoPart(r.sub_loc) === s &&
      normGeoPart(r.polling_station) === p
  )

  if (!match) {
    return { ok: false, message: 'Polling selection does not match official records' }
  }

  return { ok: true }
}
