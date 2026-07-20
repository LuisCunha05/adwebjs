import { BaseRepository } from '@/services/base'
import type { InternalError } from '@/types/error'
import type { Result } from '@/types/utils'
import { errorResult } from '@/utils/error'
import type { DatabaseClient } from '../types/database'
import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationRepository extends BaseRepository implements IVacationRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(vacation: Omit<Vacation, 'id' | 'createdAt'>): Promise<Result<number, InternalError>> {
    try {
      const result = await this.db.vacation.create({
        data: {
          userId: vacation.userId,
          startDate: vacation.startDate,
          endDate: vacation.endDate,
          description: vacation.description || null,
        },
        select: { id: true },
      })
      return { ok: true, value: result.id }
    } catch (err: unknown) {
      return errorResult('Internal', err instanceof Error ? err.message : 'Failed to add vacation')
    }
  }

  async get(id: number): Promise<Result<Vacation | undefined, InternalError>> {
    try {
      const row = await this.db.vacation.findUnique({ where: { id } })
      if (!row) return { ok: true, value: undefined }
      return {
        ok: true,
        value: {
          id: row.id,
          userId: row.userId,
          startDate: row.startDate.toISOString(),
          endDate: row.endDate.toISOString(),
          description: row.description || undefined,
          createdAt: row.createdAt.toISOString(),
        },
      }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to get vacation by ID',
      )
    }
  }

  async listAll(): Promise<Result<Vacation[], InternalError>> {
    try {
      const rows = await this.db.vacation.findMany({
        orderBy: { startDate: 'desc' },
      })
      const value = rows.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        description: row.description || undefined,
        createdAt: row.createdAt.toISOString(),
      }))
      return { ok: true, value }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to list vacations',
      )
    }
  }

  async remove(id: number): Promise<Result<void, InternalError>> {
    try {
      await this.db.vacation.delete({ where: { id } })
      return { ok: true, value: undefined }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to remove vacation',
      )
    }
  }
}
