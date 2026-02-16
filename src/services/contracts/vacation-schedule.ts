import type { IVacationScheduler } from '../../types/contracts/vacation-scheduler'
import type { IDatabase } from '../../types/database'
import { type IScheduleRepository, ScheduleStatus } from '../../types/schedule'
import type { IVacationRepository } from '../../types/vacation'

export class VacationScheduleService implements IVacationScheduler {
  constructor(
    private db: IDatabase,
    private vacationRepo: IVacationRepository,
    private scheduleRepo: IScheduleRepository,
  ) {}

  schedule(userId: string, startDate: string, endDate: string): number {
    return this.db.transaction(() => {
      // 1. Create Vacation
      const vacationId = this.vacationRepo.add({
        userId,
        startDate,
        endDate,
        description: `Férias ${userId}`,
      })

      // 2. Schedule Start Task
      this.scheduleRepo.add({
        type: 'VACATION_START',
        status: ScheduleStatus.PENDING,
        runAt: startDate,
        relatedId: vacationId,
        relatedTable: 'vacations',
      })

      // 3. Schedule End Task
      this.scheduleRepo.add({
        type: 'VACATION_END',
        status: ScheduleStatus.PENDING,
        runAt: endDate,
        relatedId: vacationId,
        relatedTable: 'vacations',
      })

      return vacationId
    })
  }

  // Handles the deletion of a vacation and its associated tasks
  cancel(vacationId: number): number {
    return this.db.transaction(() => {
      const tasksRemoved = this.scheduleRepo.removeByRelatedId(vacationId, 'vacations')
      this.vacationRepo.remove(vacationId)
      return tasksRemoved
    })
  }
}
