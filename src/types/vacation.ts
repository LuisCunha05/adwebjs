import type { BaseRepository } from '@/services/base'

export interface Vacation {
  id: number
  userId: string
  startDate: string
  endDate: string
  description?: string
  createdAt: string
}

export interface IVacationRepository extends BaseRepository {
  add(vacation: Omit<Vacation, 'id' | 'createdAt'>): Promise<number>
  get(id: number): Promise<Vacation | undefined>
  remove(id: number): Promise<void>
}
