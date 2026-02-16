'use server'

import { ldapService } from '@/services/container'

import { verifySession } from '@/utils/manage-jwt'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function getStats(): Promise<
  ActionResult<{ usersCount: number; disabledCount: number; groupsCount: number }>
> {
  await verifySession()
  try {
    const stats = await ldapService.getStats()
    return { ok: true, data: stats }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Stats failed' }
  }
}
