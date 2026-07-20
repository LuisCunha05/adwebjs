import { BaseRepository } from '@/services/base'
import type { InternalError } from '@/types/error'
import type { Result } from '@/types/utils'
import { errorResult } from '@/utils/error'
import type { DatabaseClient } from '../types/database'
import { type IScheduleRepository, type ScheduledTask, ScheduleStatus } from '../types/schedule'

export class ScheduleRepository extends BaseRepository implements IScheduleRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): Promise<Result<number, InternalError>> {
    try {
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
      return { ok: true, value: result.id }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to add scheduled task',
      )
    }
  }

  async listPending(
    maxDate: Date = new Date(),
    relatedTable?: string,
  ): Promise<Result<ScheduledTask[], InternalError>> {
    try {
      const rows = await this.db.scheduledTask.findMany({
        where: {
          status: { in: [ScheduleStatus.PENDING, ScheduleStatus.FAILED] },
          runAt: { lte: maxDate.toISOString() },
          ...(relatedTable !== undefined ? { relatedTable } : {}),
        },
        orderBy: { runAt: 'asc' },
      })
      return { ok: true, value: rows.map((row: any) => this.mapRowToTask(row)) }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to list pending/failed scheduled tasks',
      )
    }
  }

  async listAll(): Promise<Result<ScheduledTask[], InternalError>> {
    try {
      const rows = await this.db.scheduledTask.findMany({
        orderBy: { runAt: 'asc' },
      })
      return { ok: true, value: rows.map((row: any) => this.mapRowToTask(row)) }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to list scheduled tasks',
      )
    }
  }

  async listPaginated(params: {
    skip?: number
    take?: number
    vacationIds?: number[]
    startDate?: Date
    endDate?: Date
  }): Promise<Result<{ tasks: ScheduledTask[]; total: number }, InternalError>> {
    try {
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
        ok: true,
        value: {
          tasks: rows.map((row: any) => this.mapRowToTask(row)),
          total,
        },
      }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to list paginated scheduled tasks',
      )
    }
  }

  async updateStatus(
    id: number,
    status: ScheduleStatus,
    details?: { error?: string; executedAt?: string },
  ): Promise<Result<void, InternalError>> {
    try {
      await this.db.scheduledTask.update({
        where: { id },
        data: {
          status,
          error: details?.error || null,
          executedAt: details?.executedAt || null,
        },
      })
      return { ok: true, value: undefined }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to update scheduled task status',
      )
    }
  }

  async remove(id: number): Promise<Result<boolean, InternalError>> {
    try {
      await this.db.scheduledTask.delete({ where: { id } })
      return { ok: true, value: true }
    } catch (_e: unknown) {
      return { ok: true, value: false }
    }
  }

  async removeByRelatedId(
    relatedId: number,
    relatedTable: string,
  ): Promise<Result<number, InternalError>> {
    try {
      const result = await this.db.scheduledTask.deleteMany({
        where: { relatedId, relatedTable },
      })
      return { ok: true, value: result.count }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to remove scheduled tasks by related ID',
      )
    }
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
