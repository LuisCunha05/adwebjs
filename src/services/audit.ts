import type { AuditRepository } from '../repositories/audit-repository'
import type { AuditAction, AuditEntry, AuditListFilters } from '../types/audit'

export class AuditService {
  constructor(private repository: AuditRepository) {}

  async log(params: {
    action: AuditAction
    actor: string
    target?: string
    details?: Record<string, unknown>
    success: boolean
    error?: string
  }): Promise<void> {
    const entry: Omit<AuditEntry, 'id'> = {
      at: new Date().toISOString(),
      action: params.action,
      actor: params.actor,
      target: params.target,
      details: params.details,
      success: params.success,
      error: params.error,
    }
    await this.repository.create(entry)
  }

  async list(filters: AuditListFilters = {}): Promise<AuditEntry[]> {
    return await this.repository.list(filters)
  }
}
