import { BaseRepository } from '@/services/base'
import type { DatabaseClient } from '../types/database'
import { type IScheduleRepository, type ScheduledTask, ScheduleStatus } from '../types/schedule'

export class ScheduleRepository extends BaseRepository implements IScheduleRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.db.scheduledTask.create({
      data: {
        type: task.type,
        status: task.status,
        runAt: task.runAt,
        relatedId: task.relatedId,
        relatedTable: task.relatedTable,
      },
      select: { id: true },
    })
    return result.id
  }

  async listPending(maxDate: Date = new Date()): Promise<ScheduledTask[]> {
    const rows = await this.db.scheduledTask.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        runAt: { lte: maxDate.toISOString() },
      },
      orderBy: { runAt: 'asc' },
    })
    return rows.map((row) => this.mapRowToTask(row))
  }

  async listAll(): Promise<ScheduledTask[]> {
    const rows = await this.db.scheduledTask.findMany({
      orderBy: { runAt: 'asc' },
    })
    return rows.map((row) => this.mapRowToTask(row))
  }

  async listPaginated(params: {
    skip?: number
    take?: number
    vacationIds?: number[]
    startDate?: Date
    endDate?: Date
  }): Promise<{ tasks: ScheduledTask[]; total: number }> {
    const where: any = {}

    if (params.vacationIds !== undefined) {
      where.relatedTable = 'vacations'
      where.relatedId = { in: params.vacationIds }
    }

    if (params.startDate || params.endDate) {
      where.runAt = {}
      if (params.startDate) {
        where.runAt.gte = params.startDate
      }
      if (params.endDate) {
        where.runAt.lte = params.endDate
      }
    }

    const [rows, total] = await Promise.all([
      this.db.scheduledTask.findMany({
        where,
        orderBy: { runAt: 'asc' },
        ...(params.skip !== undefined ? { skip: params.skip } : {}),
        ...(params.take !== undefined ? { take: params.take } : {}),
      }),
      this.db.scheduledTask.count({ where }),
    ])

    return {
      tasks: rows.map((row) => this.mapRowToTask(row)),
      total,
    }
  }

  async updateStatus(
    id: number,
    status: ScheduleStatus,
    details?: { error?: string; executedAt?: string },
  ): Promise<void> {
    await this.db.scheduledTask.update({
      where: { id },
      data: {
        status,
        error: details?.error || null,
        executedAt: details?.executedAt || null,
      },
    })
  }

  async remove(id: number): Promise<boolean> {
    try {
      await this.db.scheduledTask.delete({ where: { id } })
      return true
    } catch (e) {
      return false
    }
  }

  async removeByRelatedId(relatedId: number, relatedTable: string): Promise<number> {
    const result = await this.db.scheduledTask.deleteMany({
      where: { relatedId, relatedTable },
    })
    return result.count
  }

  private mapRowToTask(row: any): ScheduledTask {
    return {
      id: row.id,
      type: row.type,
      status: row.status as ScheduleStatus,
      runAt: row.runAt,
      relatedId: row.relatedId,
      relatedTable: row.relatedTable,
      createdAt: row.createdAt,
      executedAt: row.executedAt || undefined,
      error: row.error || undefined,
    }
  }
}
