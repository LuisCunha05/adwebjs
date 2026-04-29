import { cache } from 'react'
import { ldapService } from '@/services/container'

export const listOusCached = cache(() => {
  console.log('ous cached')
  return ldapService.listOUs()
})

export const showUserCached = cache((id: string) => {
  console.log({ userCache: id })
  return ldapService.getUser(id)
})
