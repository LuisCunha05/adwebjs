import 'server-only'
import { cache } from 'react'
import { getSessionCached } from '@/queries/session'
import { ouService, userService } from '@/services/container'

export const listOusCached = cache(async () => {
  await getSessionCached()
  return ouService.listOUs()
})

export const showUserCached = cache(async (id: string) => {
  await getSessionCached()
  return userService.get(id)
})

export const listUsersCached = cache(async () => {
  await getSessionCached()
  return userService.listAll()
})
