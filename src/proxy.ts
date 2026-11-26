import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/constants/config'
import { verifySessionCookie } from '@/utils/session-core'

export async function proxy(request: NextRequest) {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isLoginPage = request.nextUrl.pathname === '/login'
  const session = await verifySessionCookie(cookieValue)

  if (!session && !isLoginPage) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    if (cookieValue) {
      response.cookies.delete(SESSION_COOKIE_NAME)
    }
    return response
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (cookieValue && !session) {
    const response = NextResponse.next()
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
