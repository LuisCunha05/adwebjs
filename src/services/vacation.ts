import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationService {
  constructor(private vacationRepo: IVacationRepository) {}

  async get(id: number): Promise<Vacation | undefined> {
    return await this.vacationRepo.get(id)
  }

  async list(): Promise<Vacation[]> {
    return await this.vacationRepo.listAll()
  }
}
