import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GOOGLE_PROVIDER = 'google'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export function getOAuth2Client() {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET')
  const redirectUri = requireEnv('GOOGLE_REDIRECT_URI')
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export async function upsertGoogleRefreshToken(refreshToken) {
  await prisma.googleOAuthToken.upsert({
    where: { provider: GOOGLE_PROVIDER },
    create: { provider: GOOGLE_PROVIDER, refreshToken },
    update: { refreshToken },
  })
}

export async function getGoogleRefreshToken() {
  const row = await prisma.googleOAuthToken.findUnique({
    where: { provider: GOOGLE_PROVIDER },
    select: { refreshToken: true },
  })
  return row?.refreshToken || null
}

export function getGoogleAuthUrl() {
  const oauth2 = getOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  })
}

export async function exchangeCodeForTokens(code) {
  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

async function getCalendarClient() {
  const refreshToken = await getGoogleRefreshToken()
  if (!refreshToken) {
    throw new Error('Google Calendar is not connected (missing refresh token)')
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth: oauth2 })
}

export async function createMeetEventForBooking(booking) {
  const calendar = await getCalendarClient()

  const requestId = `booking-${booking.id}`
  const start = booking.startTime.toISOString()
  const end = booking.endTime.toISOString()

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: 'PhD Success Scheduling Session',
      description: `Booking ID: ${booking.id}\nClient: ${booking.name} <${booking.email}>`,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      attendees: [{ email: booking.email }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const created = event.data
  const meetLink =
    created?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    created?.hangoutLink ||
    null

  return {
    googleEventId: created?.id || null,
    meetLink,
    htmlLink: created?.htmlLink || null,
  }
}

export async function updateMeetEventForBooking(booking) {
  if (!booking.googleEventId) {
    throw new Error('Booking has no Google Calendar event to update')
  }

  const calendar = await getCalendarClient()
  const start = booking.startTime.toISOString()
  const end = booking.endTime.toISOString()

  const event = await calendar.events.patch({
    calendarId: 'primary',
    eventId: booking.googleEventId,
    sendUpdates: 'all',
    requestBody: {
      summary: 'PhD Success Scheduling Session',
      description: `Booking ID: ${booking.id}\nClient: ${booking.name} <${booking.email}>`,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      attendees: [{ email: booking.email }],
    },
  })

  const updated = event.data
  const meetLink =
    updated?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    updated?.hangoutLink ||
    booking.meetLink ||
    null

  return {
    googleEventId: updated?.id || booking.googleEventId,
    meetLink,
    htmlLink: updated?.htmlLink || null,
  }
}

export async function deleteMeetEventForBooking(booking) {
  if (!booking.googleEventId) {
    return { deleted: false }
  }

  const calendar = await getCalendarClient()
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: booking.googleEventId,
    sendUpdates: 'all',
  })

  return { deleted: true }
}

