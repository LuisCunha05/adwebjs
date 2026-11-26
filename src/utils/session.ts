import 'server-only'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { Session } from '@/types/session'
import { type SessionData, sessionOptions, verifySessionCookie } from '@/utils/session-core'

export { type SessionData, sessionOptions, verifySessionCookie }

export async function createSession(session: Session) {
  const cookieStore = await cookies()
  const ironSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
  ironSession.session = session
  await ironSession.save()
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const ironSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
  ironSession.destroy()
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const ironSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
  return ironSession.session ?? null
}
