import type { InternalError } from '@/types/error'
import type { Result } from '@/types/utils'
import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationService {
  constructor(private vacationRepo: IVacationRepository) {}

  async get(id: number): Promise<Result<Vacation | undefined, InternalError>> {
    return await this.vacationRepo.get(id)
  }

  async list(): Promise<Result<Vacation[], InternalError>> {
    return await this.vacationRepo.listAll()
  }
}
