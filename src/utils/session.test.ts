import { type CookieStore, getIronSession, sealData } from 'iron-session'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/types/session'
import { type SessionData, sessionOptions, verifySessionCookie } from '@/utils/session-core'

const sampleSession: Session = {
  user: {
    sAMAccountName: 'jdoe',
    cn: 'John Doe',
    mail: 'jdoe@example.com',
    userPrincipalName: 'jdoe@example.com',
    displayName: 'John Doe',
  },
  isAdmin: true,
  canDelete: false,
}

function createMemoryCookieStore(): CookieStore {
  const store = new Map<string, string>()

  return {
    get(name) {
      const value = store.get(name)
      return value === undefined ? undefined : { name, value }
    },
    getAll() {
      return Array.from(store.entries(), ([name, value]) => ({ name, value }))
    },
    set(name, value, cookie) {
      if (cookie.maxAge === 0) {
        store.delete(name)
        return
      }
      store.set(name, value)
    },
  }
}

describe('iron-session cookie encryption', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('seals and unseals a valid session payload without exposing plaintext data', async () => {
    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    })

    expect(sealed).not.toContain(sampleSession.user.sAMAccountName)
    expect(sealed).not.toContain(sampleSession.user.mail!)

    const result = await verifySessionCookie(sealed)
    expect(result).toEqual(sampleSession)
  })

  it('returns null for missing, tampered, or wrong-key cookies', async () => {
    expect(await verifySessionCookie(undefined)).toBeNull()
    expect(await verifySessionCookie('')).toBeNull()
    expect(await verifySessionCookie('not-a-valid-seal')).toBeNull()

    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    })
    const tampered = `${sealed.slice(0, -4)}XXXX`
    expect(await verifySessionCookie(tampered)).toBeNull()

    const wrongKey = await verifySessionCookie(sealed, {
      password: 'a-completely-different-32-char-secret-key',
    })
    expect(wrongKey).toBeNull()
  })

  it('rejects an expired seal', async () => {
    vi.useFakeTimers()

    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: 1,
    })

    // iron-webcrypto allows 60s clock skew (timestampSkewSec) past ttl
    vi.advanceTimersByTime(62_000)

    const result = await verifySessionCookie(sealed, { ttl: 1 })
    expect(result).toBeNull()
  })

  it('saves, reads, and destroys sessions via CookieStore', async () => {
    const cookieStore = createMemoryCookieStore()

    const writeSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
    writeSession.session = sampleSession
    await writeSession.save()

    const rawCookie = cookieStore.get(sessionOptions.cookieName)?.value
    expect(rawCookie).toBeTruthy()
    expect(await verifySessionCookie(rawCookie)).toEqual(sampleSession)

    const readSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
    expect(readSession.session).toEqual(sampleSession)

    readSession.destroy()
    expect(cookieStore.get(sessionOptions.cookieName)).toBeUndefined()

    const afterDestroy = await getIronSession<SessionData>(cookieStore, sessionOptions)
    expect(afterDestroy.session).toBeUndefined()
  })
})
