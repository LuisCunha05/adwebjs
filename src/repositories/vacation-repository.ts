import { BaseRepository } from '@/services/base'
import type { DatabaseClient } from '../types/database'
import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationRepository extends BaseRepository implements IVacationRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(vacation: Omit<Vacation, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.db.vacation.create({
      data: {
        userId: vacation.userId,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        description: vacation.description || null,
      },
      select: { id: true },
    })
    return result.id
  }

  async get(id: number): Promise<Vacation | undefined> {
    const row = await this.db.vacation.findUnique({ where: { id } })
    if (!row) return undefined
    return {
      id: row.id,
      userId: row.userId,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      description: row.description || undefined,
      createdAt: row.createdAt.toISOString(),
    }
  }

  async listAll(): Promise<Vacation[]> {
    const rows = await this.db.vacation.findMany({
      orderBy: { startDate: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      description: row.description || undefined,
      createdAt: row.createdAt.toISOString(),
    }))
  }

  async remove(id: number): Promise<void> {
    await this.db.vacation.delete({ where: { id } })
  }
}
