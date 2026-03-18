export type SessionType = 'consultative' | 'consult-dri'

export const SESSION_TYPE_STORAGE_KEY = 'phd_success:selectedSessionType' as const

export function isSessionType(value: unknown): value is SessionType {
  return value === 'consultative' || value === 'consult-dri'
}

export function getSessionCopy(sessionType: SessionType): { title: string; description: string } {
  switch (sessionType) {
    case 'consultative':
      return {
        title: 'Consultative Sessions',
        description: 'Consultative sessions for PhD, Business and select postgraduate clients.',
      }
    case 'consult-dri':
      return {
        title: 'Consult DRI Services',
        description: 'Consult DRI services session for PhD, Business and select postgraduate clients.',
      }
  }
}

