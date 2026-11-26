import { BaseRepository } from '@/services/base'
import type { AuditEntry, AuditListFilters } from '../types/audit'
import type { DatabaseClient } from '../types/database'

export class AuditRepository extends BaseRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async create(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
    await this.db.orm.public.AuditLog.create({
      action: entry.action,
      actor: entry.actor,
      target: entry.target || null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      success: entry.success,
      error: entry.error || null,
    })
  }

  async list(filters: AuditListFilters): Promise<AuditEntry[]> {
    let query = this.db.orm.public.AuditLog

    if (filters.since) {
      const since = new Date(filters.since)
      query = query.where((a) => a.createdAt.gte(since))
    }
    if (filters.until) {
      const until = new Date(filters.until)
      query = query.where((a) => a.createdAt.lte(until))
    }
    if (filters.action) {
      const action = filters.action
      query = query.where({ action })
    }
    if (filters.actor) {
      const actor = filters.actor
      query = query.where({ actor })
    }
    if (filters.target) {
      const target = filters.target
      query = query.where((a) => a.target.like(`%${target}%`))
    }

    let ordered = query.orderBy((a) => a.createdAt.desc())
    if (filters.limit) {
      ordered = ordered.limit(filters.limit)
    }

    const rows = await ordered.all()

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action as AuditEntry['action'],
      actor: row.actor,
      target: row.target || undefined,
      details: row.details ? JSON.parse(row.details) : undefined,
      success: row.success,
      error: row.error || undefined,
    }))
  }
}
