import rows from './funyula-polling-stations.json'

export type PollingRow = (typeof rows)[number]

/** Match backend: null / whitespace → '' */
export function normGeoPart(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return ''
  return value.trim()
}

/** Display label for dropdown (empty bucket from null loc/sub). */
export function geoOptionLabel(value: string): string {
  return value === '' ? '(Not specified)' : value
}

const sorted = [...(rows as PollingRow[])].sort((a, b) => a.sn - b.sn)

/** Official wards (sorted). */
export const WARD_OPTIONS = Array.from(new Set(sorted.map((r) => normGeoPart(r.ward))))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b))

export function getLocationsForWard(ward: string): string[] {
  const w = normGeoPart(ward)
  const set = new Set<string>()
  for (const r of sorted) {
    if (normGeoPart(r.ward) !== w) continue
    set.add(normGeoPart(r.loc))
  }
  return Array.from(set).sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b)
  })
}

export function getSubLocationsFor(ward: string, location: string): string[] {
  const w = normGeoPart(ward)
  const l = normGeoPart(location)
  const set = new Set<string>()
  for (const r of sorted) {
    if (normGeoPart(r.ward) !== w || normGeoPart(r.loc) !== l) continue
    set.add(normGeoPart(r.sub_loc))
  }
  return Array.from(set).sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b)
  })
}

export function getPollingStationsFor(ward: string, location: string, subLocation: string): string[] {
  const w = normGeoPart(ward)
  const l = normGeoPart(location)
  const s = normGeoPart(subLocation)
  const list: string[] = []
  for (const r of sorted) {
    if (
      normGeoPart(r.ward) === w &&
      normGeoPart(r.loc) === l &&
      normGeoPart(r.sub_loc) === s
    ) {
      list.push(normGeoPart(r.polling_station))
    }
  }
  return list.sort((a, b) => a.localeCompare(b))
}
