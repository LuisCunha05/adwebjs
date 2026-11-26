import { expect, test } from '@playwright/test'
import { sealData } from 'iron-session'
import type { Session } from '@/types/session'
import type { SessionData } from '@/utils/session-core'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'adweb_session'
const SESSION_SECRET = process.env.SESSION_SECRET
const SESSION_TTL = Number(process.env.SESSION_EXPIRATION_SECONDS) || 3600

const sampleSession: Session = {
  user: {
    sAMAccountName: 'e2e-admin',
    cn: 'E2E Admin',
    mail: 'e2e-admin@example.com',
    userPrincipalName: 'e2e-admin@example.com',
    displayName: 'E2E Admin',
  },
  isAdmin: true,
  canDelete: false,
}

async function createSealedSessionCookie() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET (>= 32 chars) must be set in .env to run E2E session tests')
  }

  return sealData({ session: sampleSession } satisfies SessionData, {
    password: SESSION_SECRET,
    ttl: SESSION_TTL,
  })
}

test.describe('session protection and encrypted cookies', () => {
  test('redirects unauthenticated visitor from / to /login', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('AD Web Manager', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Usuário ou e-mail')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
  })

  test('redirects tampered cookie on / to /login and clears the cookie', async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: COOKIE_NAME,
        value: 'tampered-invalid-seal',
        url: baseURL!,
      },
    ])

    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === COOKIE_NAME)).toBeUndefined()
  })

  test('clears tampered cookie on /login without a redirect loop', async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: COOKIE_NAME,
        value: 'tampered-invalid-seal',
        url: baseURL!,
      },
    ])

    await page.goto('/login')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === COOKIE_NAME)).toBeUndefined()
  })

  test('redirects valid sealed session cookie away from /login to /', async ({ request }) => {
    const sealed = await createSealedSessionCookie()

    const response = await request.get('/login', {
      maxRedirects: 0,
      headers: {
        cookie: `${COOKIE_NAME}=${sealed}`,
      },
    })

    expect(response.status()).toBe(307)
    expect(response.headers().location).toMatch(/\/$/)
  })

  test('rejects unauthenticated and tampered requests to /api/schedule/export with 401', async ({
    request,
  }) => {
    const unauth = await request.get('/api/schedule/export')
    expect(unauth.status()).toBe(401)

    const tampered = await request.get('/api/schedule/export', {
      headers: {
        cookie: `${COOKIE_NAME}=tampered-invalid-seal`,
      },
    })
    expect(tampered.status()).toBe(401)
  })
})
