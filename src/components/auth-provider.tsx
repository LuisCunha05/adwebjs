'use client'

import type React from 'react'
import { createContext, use, useCallback, useContext, useEffect, useState } from 'react'
import { logout as logoutAction } from '@/actions/auth'
import type { Session } from '@/types/session'

type AuthState = {
  session: Promise<Session>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Promise<Session>
}) {

  const logout = useCallback(async () => {
    try {
      await logoutAction()
    } catch {
      /* ignore */
    }
  }, [])

  return <AuthContext.Provider value={{ session, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useSession() {
  const { session } = useAuth()
  return use(session)
}
