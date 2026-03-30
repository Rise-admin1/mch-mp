export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/** Use this URL when sharing the contribute page so WhatsApp/Google show the correct preview */
export const CONTRIBUTE_SHARE_URL =
  process.env.NEXT_PUBLIC_CONTRIBUTE_SHARE_URL ||
  `${BACKEND_URL.replace(/\/$/, '')}/contribute`
