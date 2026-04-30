import { cache } from 'react'
import { ouService, userService } from '@/services/container'

export const listOusCached = cache(() => {
  console.log('ous cached')
  return ouService.listOUs()
})

export const showUserCached = cache((id: string) => {
  console.log({ userCache: id })
  return userService.get(id)
})
