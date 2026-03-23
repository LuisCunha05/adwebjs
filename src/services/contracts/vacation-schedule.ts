import { executeTx } from '../../infrastructure/database'
import { ScheduleRepository } from '../../repositories/schedule-repository'
import { VacationRepository } from '../../repositories/vacation-repository'
import type { IVacationScheduler } from '../../types/contracts/vacation-scheduler'
import type { DatabaseClient } from '../../types/database'
import { type IScheduleRepository, ScheduleStatus } from '../../types/schedule'
import type { IVacationRepository } from '../../types/vacation'

export class VacationScheduleService implements IVacationScheduler {
  constructor(
    private db: DatabaseClient,
    private vacationRepo: IVacationRepository,
    private scheduleRepo: IScheduleRepository,
  ) {}

  async schedule(userId: string, startDate: string, endDate: string): Promise<number> {
    return await executeTx(this.db, async (tx) => {
      // Use transaction-scoped repositories
      const txVacationRepo = new VacationRepository(tx)
      const txScheduleRepo = new ScheduleRepository(tx)

      // 1. Create Vacation
      const vacationId = await txVacationRepo.add({
        userId,
        startDate,
        endDate,
        description: `Férias ${userId}`,
      })

      // 2. Schedule Start Task
      await txScheduleRepo.add({
        type: 'VACATION_START',
        status: ScheduleStatus.PENDING,
        runAt: startDate,
        relatedId: vacationId,
        relatedTable: 'vacations',
      })

      // 3. Schedule End Task
      await txScheduleRepo.add({
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
  async cancel(vacationId: number): Promise<number> {
    return await executeTx(this.db, async (tx) => {
      const txVacationRepo = new VacationRepository(tx)
      const txScheduleRepo = new ScheduleRepository(tx)

      const tasksRemoved = await txScheduleRepo.removeByRelatedId(vacationId, 'vacations')
      await txVacationRepo.remove(vacationId)
      return tasksRemoved
    })
  }
}
