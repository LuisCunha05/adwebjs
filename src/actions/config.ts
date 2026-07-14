'use server'

import { getSessionCached } from '@/queries/session'
import { getEditConfig, getFetchAttributes } from '@/services/ad-user-attributes'
import type { EditAttribute } from '@/types/ldap'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function getUserAttributesConfig(): Promise<
  ActionResult<{ fetch: string[]; edit: EditAttribute[] }>
> {
  await getSessionCached()
  try {
    return {
      ok: true,
      data: {
        fetch: getFetchAttributes(),
        edit: getEditConfig(),
      },
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Config failed' }
  }
}
