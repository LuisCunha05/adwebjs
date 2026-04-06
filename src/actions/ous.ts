'use server'

import { ldapService } from '@/services/container'

import { verifySession } from '@/utils/manage-jwt'
import type { OU } from '@/types/ldap'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}
