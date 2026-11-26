import { BaseRepository } from '@/services/base'
import type { DatabaseClient } from '../types/database'
import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationRepository extends BaseRepository implements IVacationRepository {
  constructor(protected db: DatabaseClient) {
    super(db)
  }

  async add(vacation: Omit<Vacation, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.db.orm.public.Vacation.select('id').create({
      userId: vacation.userId,
      startDate: new Date(vacation.startDate),
      endDate: new Date(vacation.endDate),
      description: vacation.description || null,
    })
    return result.id
  }

  async get(id: number): Promise<Vacation | undefined> {
    const row = await this.db.orm.public.Vacation.first({ id })
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
    const rows = await this.db.orm.public.Vacation.orderBy((v) => v.startDate.desc()).all()
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
    await this.db.orm.public.Vacation.where({ id }).delete()
  }
}
