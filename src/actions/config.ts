'use server'

import { getEditConfig, getFetchAttributes } from '@/services/ad-user-attributes'
import type { EditAttribute } from '@/types/ldap'

import { verifySession } from '@/utils/manage-jwt'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function getUserAttributesConfig(): Promise<
  ActionResult<{ fetch: string[]; edit: EditAttribute[] }>
> {
  await verifySession()
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
