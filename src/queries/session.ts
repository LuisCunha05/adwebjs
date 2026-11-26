import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getSession } from '@/utils/session'

export const getSessionCached = cache(async () => {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
})
