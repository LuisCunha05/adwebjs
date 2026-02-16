import type { AuditRepository } from '../repositories/audit-repository'
import type { AuditAction, AuditEntry, AuditListFilters } from '../types/audit'

export class AuditService {
  constructor(private repository: AuditRepository) {}

  log(params: {
    action: AuditAction
    actor: string
    target?: string
    details?: Record<string, unknown>
    success: boolean
    error?: string
  }): void {
    const entry: Omit<AuditEntry, 'id'> = {
      at: new Date().toISOString(),
      action: params.action,
      actor: params.actor,
      target: params.target,
      details: params.details,
      success: params.success,
      error: params.error,
    }
    this.repository.create(entry)
  }

  list(filters: AuditListFilters = {}): AuditEntry[] {
    return this.repository.list(filters)
  }
}
