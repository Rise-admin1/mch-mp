function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined
  const trimmed = (raw || '').trim()
  if (!trimmed) {
    throw new Error('Missing VITE_API_BASE_URL (set it in your environment)')
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

const API_BASE_URL = getApiBaseUrl()

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`apiUrl(path) must start with "/": received "${path}"`)
  }
  console.log('API_BASE_URL', API_BASE_URL)
  console.log('path', path)
  return `${API_BASE_URL}${path}`
}

