import type { AuditEntry, AuditListFilters } from '../types/audit'
import type { DatabaseClient } from '../types/database'

export class AuditRepository {
  constructor(private db: DatabaseClient) {}

  async create(entry: Omit<AuditEntry, 'id'>): Promise<void> {
    await this.db.auditLog.create({
      data: {
        at: entry.at,
        action: entry.action,
        actor: entry.actor,
        target: entry.target || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        success: entry.success ? 1 : 0,
        error: entry.error || null,
      },
    })
  }

  async list(filters: AuditListFilters): Promise<AuditEntry[]> {
    const where: Record<string, unknown> = {}

    if (filters.since) where.at = { ...(where.at as object), gte: filters.since }
    if (filters.until) where.at = { ...(where.at as object), lte: filters.until }
    if (filters.action) where.action = filters.action
    if (filters.actor) where.actor = filters.actor
    if (filters.target) where.target = { contains: filters.target }

    const rows = await this.db.auditLog.findMany({
      where,
      orderBy: { at: 'desc' },
      ...(filters.limit ? { take: filters.limit } : {}),
    })

    return rows.map((row: any) => ({
      id: row.id,
      at: row.at,
      action: row.action as any,
      actor: row.actor,
      target: row.target || undefined,
      details: row.details ? JSON.parse(row.details) : undefined,
      success: Boolean(row.success),
      error: row.error || undefined,
    }))
  }
}
