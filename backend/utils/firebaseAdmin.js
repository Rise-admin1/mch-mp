import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'

/**
 * Kenya mobile → E.164 +254… (9–10 digits after country code).
 */
export function normalizeKePhone(raw) {
  if (raw == null || typeof raw !== 'string') return ''
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('254')) d = d.slice(3)
  else if (d.startsWith('0')) d = d.slice(1)
  if (d.length < 9 || d.length > 10) return ''
  return `+254${d}`
}

/**
 * @returns {import('firebase-admin/auth').Auth | null}
 */
export function getFirebaseAdminAuth() {
  if (admin.apps.length > 0) {
    return admin.auth()
  }

  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  if (!jsonRaw && !jsonPath) {
    return null
  }

  try {
    const credObj = jsonRaw
      ? JSON.parse(jsonRaw)
      : JSON.parse(
          readFileSync(
            path.isAbsolute(jsonPath) ? jsonPath : path.join(process.cwd(), jsonPath),
            'utf8'
          )
        )

    admin.initializeApp({
      credential: admin.credential.cert(credObj),
    })
    return admin.auth()
  } catch (e) {
    console.error('Firebase Admin init failed:', e?.message || e)
    return null
  }
}

/**
 * Submit allowed if: (1) valid Firebase ID token for this phone, or (2) phone already in Firebase Auth.
 * @returns {Promise<{ ok: true } | { ok: false, status: number, message: string }>}
 */
export async function ensureVolunteerCanSubmitPhone(normalizedPhone, firebaseIdToken) {
  const auth = getFirebaseAdminAuth()

  if (!auth) {
    return {
      ok: false,
      status: 503,
      message:
        'Phone verification is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.',
    }
  }

  const token = typeof firebaseIdToken === 'string' ? firebaseIdToken.trim() : ''

  if (token) {
    try {
      const decoded = await auth.verifyIdToken(token)
      const claimPhone = decoded.phone_number ? normalizeKePhone(decoded.phone_number) : ''
      if (!claimPhone || claimPhone !== normalizedPhone) {
        return { ok: false, status: 403, message: 'Verified phone does not match the number you entered' }
      }
      return { ok: true }
    } catch {
      return { ok: false, status: 403, message: 'Invalid or expired verification. Request a new code and try again.' }
    }
  }

  try {
    await auth.getUserByPhoneNumber(normalizedPhone)
    return { ok: true }
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      return {
        ok: false,
        status: 403,
        message: 'Verify your phone number with the SMS code we send you.',
      }
    }
    throw e
  }
}
