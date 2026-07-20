import type { BaseRepository } from '@/services/base'
import type { InternalError } from './error'
import type { Result } from './utils'

export interface Vacation {
  id: number
  userId: string
  startDate: string
  endDate: string
  description?: string
  createdAt: string
}

export interface IVacationRepository extends BaseRepository {
  add(vacation: Omit<Vacation, 'id' | 'createdAt'>): Promise<Result<number, InternalError>>
  get(id: number): Promise<Result<Vacation | undefined, InternalError>>
  listAll(): Promise<Result<Vacation[], InternalError>>
  remove(id: number): Promise<Result<void, InternalError>>
}
