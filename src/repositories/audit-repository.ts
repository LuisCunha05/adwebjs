import { BaseRepository } from '@/services/base'
import type { AuditEntry, AuditListFilters } from '../types/audit'
import type { DatabaseClient } from '../types/database'

export class AuditRepository extends BaseRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async create(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
    await this.db.auditLog.create({
      data: {
        action: entry.action,
        actor: entry.actor,
        target: entry.target || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        success: entry.success,
        error: entry.error || null,
      },
    })
  }

  async list(filters: AuditListFilters): Promise<AuditEntry[]> {
    const where: Record<string, unknown> = {}

    if (filters.since) where.createdAt = { ...(where.createdAt as object), gte: filters.since }
    if (filters.until) where.createdAt = { ...(where.createdAt as object), lte: filters.until }
    if (filters.action) where.action = filters.action
    if (filters.actor) where.actor = filters.actor
    if (filters.target) where.target = { contains: filters.target }

    const rows = await this.db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(filters.limit ? { take: filters.limit } : {}),
    })

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action as any,
      actor: row.actor,
      target: row.target || undefined,
      details: row.details ? JSON.parse(row.details) : undefined,
      success: row.success,
      error: row.error || undefined,
    }))
  }
}
