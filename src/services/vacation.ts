import { IVacationRepository, Vacation } from './interfaces';

export class VacationService {
    constructor(
        private vacationRepo: IVacationRepository
    ) { }

    get(id: number): Vacation | undefined {
        return this.vacationRepo.get(id);
    }
}
