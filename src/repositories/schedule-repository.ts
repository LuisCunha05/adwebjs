import type { ResultType } from '@prisma/orm-postgres/components/runtime'
import { and } from '@prisma/orm-postgres/orm-client'
import { BaseRepository } from '@/services/base'
import type { DatabaseClient } from '../types/database'
import { type IScheduleRepository, type ScheduledTask, ScheduleStatus } from '../types/schedule'

type ScheduledTaskRow = ResultType<DatabaseClient['orm']['public']['ScheduledTask']>

export class ScheduleRepository extends BaseRepository implements IScheduleRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.db.orm.public.ScheduledTask.select('id').create({
      type: task.type,
      status: task.status,
      runAt: new Date(task.runAt),
      relatedId: task.relatedId,
      relatedTable: task.relatedTable,
    })
    return result.id
  }

  async listPending(maxDate: Date = new Date()): Promise<ScheduledTask[]> {
    const rows = await this.db.orm.public.ScheduledTask.where((t) =>
      and(t.status.eq(ScheduleStatus.PENDING), t.runAt.lte(maxDate)),
    )
      .orderBy((t) => t.runAt.asc())
      .all()
    return rows.map((row) => this.mapRowToTask(row))
  }

  async listAll(): Promise<ScheduledTask[]> {
    const rows = await this.db.orm.public.ScheduledTask.orderBy((t) => t.runAt.asc()).all()
    return rows.map((row) => this.mapRowToTask(row))
  }

  async listPaginated(params: {
    skip?: number
    take?: number
    vacationIds?: number[]
    startDate?: Date
    endDate?: Date
  }): Promise<{ tasks: ScheduledTask[]; total: number }> {
    if (params.vacationIds !== undefined && params.vacationIds.length === 0) {
      return { tasks: [], total: 0 }
    }

    let query = this.db.orm.public.ScheduledTask

    if (params.vacationIds !== undefined) {
      const vacationIds = params.vacationIds
      query = query.where((t) => and(t.relatedTable.eq('vacations'), t.relatedId.in(vacationIds)))
    }

    if (params.startDate) {
      const startDate = params.startDate
      query = query.where((t) => t.runAt.gte(startDate))
    }
    if (params.endDate) {
      const endDate = params.endDate
      query = query.where((t) => t.runAt.lte(endDate))
    }

    let paged = query.orderBy((t) => t.runAt.asc())
    if (params.skip !== undefined) {
      paged = paged.offset(params.skip)
    }
    if (params.take !== undefined) {
      paged = paged.limit(params.take)
    }

    const [rows, agg] = await Promise.all([
      paged.all(),
      query.aggregate((a) => ({ total: a.count() })),
    ])

    return {
      tasks: rows.map((row) => this.mapRowToTask(row)),
      total: agg.total,
    }
  }

  async updateStatus(
    id: number,
    status: ScheduleStatus,
    details?: { error?: string; executedAt?: string },
  ): Promise<void> {
    await this.db.orm.public.ScheduledTask.where({ id }).update({
      status,
      error: details?.error || null,
      executedAt: details?.executedAt ? new Date(details.executedAt) : null,
    })
  }

  async remove(id: number): Promise<boolean> {
    const deleted = await this.db.orm.public.ScheduledTask.where({ id }).delete()
    return deleted !== null
  }

  async removeByRelatedId(relatedId: number, relatedTable: string): Promise<number> {
    return await this.db.orm.public.ScheduledTask.where({
      relatedId,
      relatedTable,
    }).deleteAndCount()
  }

  private mapRowToTask(row: ScheduledTaskRow): ScheduledTask {
    return {
      id: row.id,
      type: row.type,
      status: row.status as ScheduleStatus,
      runAt: row.runAt.toISOString(),
      relatedId: row.relatedId,
      relatedTable: row.relatedTable,
      createdAt: row.createdAt.toISOString(),
      executedAt: row.executedAt ? row.executedAt.toISOString() : undefined,
      error: row.error || undefined,
    }
  }
}
