import { type SessionOptions, unsealData } from 'iron-session'
import { SESSION_COOKIE_NAME, SESSION_EXPIRATION_SECONDS, SESSION_SECRET } from '@/constants/config'
import type { Session } from '@/types/session'

export interface SessionData {
  session?: Session
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  ttl: SESSION_EXPIRATION_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  },
}

export async function verifySessionCookie(
  sealedValue: string | undefined,
  options: { password?: SessionOptions['password']; ttl?: number } = {},
): Promise<Session | null> {
  if (!sealedValue) return null

  const data = await unsealData<SessionData>(sealedValue, {
    password: options.password ?? SESSION_SECRET,
    ttl: options.ttl ?? SESSION_EXPIRATION_SECONDS,
  })

  if (!data || typeof data !== 'object' || !data.session?.user?.sAMAccountName) {
    return null
  }

  return data.session
}
