import { getSession } from '@/utils/manage-jwt'
import { cache } from 'react'
import { redirect } from 'next/navigation'

export const getSessionCached = cache(async () => {
    const session = await getSession()
    if (!session) {
        redirect('/login')
    }
    return session
})