import { initializeApp, FirebaseApp } from 'firebase/app'
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null

function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase auth is only available in the browser')
  }
  if (auth) return auth
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY')
  }
  const firebaseConfig = {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  }
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  return auth
}

type RecaptchaHooks = {
  onVerified?: () => void
  onExpired?: () => void
}

// Function to set up reCAPTCHA verifier
export const setupRecaptcha = (elementId: string, hooks?: RecaptchaHooks) => {
  const authInstance = getFirebaseAuth()
  const existingRecaptcha = document.getElementById(elementId)
  if (existingRecaptcha) {
    existingRecaptcha.innerHTML = ''
  }
  return new RecaptchaVerifier(authInstance, elementId, {
    size: 'normal', // Change from 'invisible' to 'normal' for better visibility
    callback: () => {
      hooks?.onVerified?.()
      console.log('reCAPTCHA verified')
    },
    'expired-callback': () => {
      hooks?.onExpired?.()
      console.log('reCAPTCHA expired')
    }
  })
}

// Function to send verification code
export const sendVerificationCode = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
  options?: { skipRender?: boolean }
) => {
  try {
    if (!options?.skipRender) {
      await recaptchaVerifier.render()
    }
    const confirmationResult = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber, recaptchaVerifier)
    return confirmationResult
  } catch (error) {
    console.error('Error sending verification code:', error)
    throw error
  }
}

// Function to verify the code
export const verifyCode = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    return result;
  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
};

export { getFirebaseAuth as getAuth } 