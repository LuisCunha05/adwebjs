import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getSession } from '@/utils/manage-jwt'

export const getSessionCached = cache(async () => {
    const session = await getSession()
    if (!session) {
        redirect('/login')
    }
    return session
})