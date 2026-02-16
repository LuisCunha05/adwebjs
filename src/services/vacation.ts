import type { IVacationRepository, Vacation } from '../types/vacation'

export class VacationService {
  constructor(private vacationRepo: IVacationRepository) {}

  get(id: number): Vacation | undefined {
    return this.vacationRepo.get(id)
  }
}
