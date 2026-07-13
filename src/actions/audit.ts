'use server'

import { getSessionCached } from '@/queries/session'
import { auditService } from '@/services/container'
import type { AuditEntry } from '@/types/audit'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function listAuditLogs(filters?: {
  since?: string
  until?: string
  action?: string
  actor?: string
  target?: string
  limit?: number
}): Promise<ActionResult<AuditEntry[]>> {
  await getSessionCached()
  try {
    const limit = filters?.limit ? Math.min(Number(filters.limit), 2000) : 500
    const entries = await auditService.list({ ...filters, limit } as any)
    return { ok: true, data: JSON.parse(JSON.stringify(entries)) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Audit list failed' }
  }
}
