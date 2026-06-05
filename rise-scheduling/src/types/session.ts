export type SessionType = 'consultative'

export const SESSION_TYPE_STORAGE_KEY = 'rise_scheduler:selectedSessionType' as const

export function isSessionType(value: unknown): value is SessionType {
  return value === 'consultative'
}

export function getSessionCopy(sessionType: SessionType): { title: string; description: string } {
  return {
    title: 'Consultative Sessions',
    description: 'Consultative sessions for PhD, Business and select postgraduate clients.',
  }
}

