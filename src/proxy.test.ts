import { sealData } from 'iron-session'
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/constants/config'
import { proxy } from '@/proxy'
import type { Session } from '@/types/session'
import { type SessionData, sessionOptions } from '@/utils/session-core'

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

function makeRequest(pathname: string, cookieValue?: string) {
  const url = `http://localhost:3000${pathname}`
  const headers = new Headers()
  if (cookieValue !== undefined) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${cookieValue}`)
  }
  return new NextRequest(url, { headers })
}

describe('proxy session route protection', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('redirects unauthenticated requests on protected routes to /login', async () => {
    const response = await proxy(makeRequest('/'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('allows unauthenticated requests on /login', async () => {
    const response = await proxy(makeRequest('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects tampered cookie on protected routes to /login and clears the cookie', async () => {
    const response = await proxy(makeRequest('/users', 'tampered-cookie-value'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('')
  })

  it('allows tampered cookie on /login without redirect loop and clears the cookie', async () => {
    const response = await proxy(makeRequest('/login', 'tampered-cookie-value'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('')
  })

  it('rejects expired session cookie on protected routes and clears the cookie', async () => {
    vi.useFakeTimers()

    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: 1,
    })

    vi.advanceTimersByTime(62_000)

    const response = await proxy(makeRequest('/', sealed))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('')
  })

  it('allows valid sealed session cookie on protected routes', async () => {
    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    })

    const response = await proxy(makeRequest('/', sealed))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects valid sealed session cookie away from /login to /', async () => {
    const sealed = await sealData({ session: sampleSession } satisfies SessionData, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    })

    const response = await proxy(makeRequest('/login', sealed))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })
})
