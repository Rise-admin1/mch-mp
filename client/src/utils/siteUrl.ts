/**
 * Canonical public site origin (no trailing slash).
 * Set NEXT_PUBLIC_SITE_URL on each deploy if it differs (e.g. preview domains).
 */
export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.funyula.com').trim()
  return raw.replace(/\/$/, '')
}
