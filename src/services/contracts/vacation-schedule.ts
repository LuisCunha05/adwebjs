import type { ILogger } from '@/types/logger'
import type { IUserService } from '@/types/user'
import { errorResult, isErrorType } from '@/utils/error'
import type { IVacationScheduler } from '../../types/contracts/vacation-scheduler'
import { type IScheduleRepository, ScheduleStatus } from '../../types/schedule'
import type { IVacationRepository } from '../../types/vacation'

export class VacationScheduleService implements IVacationScheduler {
  #logger: ILogger
  #userService: IUserService
  constructor(
    logger: ILogger,
    userService: IUserService,
    protected vacationRepo: IVacationRepository,
    protected scheduleRepo: IScheduleRepository,
  ) {
    this.#userService = userService
    this.#logger = logger
  }

  async schedule(userId: string, startDate: string, endDate: string) {
    const user = await this.#userService.get(userId)
    if (!user.ok) {
      if (isErrorType('NotFound', user.error))
        return errorResult('NotFound', `User not found for id: ${userId}`)

      return errorResult('Internal', 'internal error')
    }

    let vacationId: number | null = null
    try {
      await this.vacationRepo.transaction(async (tx) => {
        const addVacationRes = await this.vacationRepo.withTransaction(tx).add({
          userId,
          startDate,
          endDate,
          description: `Férias ${userId}`,
        })
        if (!addVacationRes.ok) {
          throw new Error(addVacationRes.error.message)
        }
        vacationId = addVacationRes.value

        const schedule = this.scheduleRepo.withTransaction(tx)
        const addStartRes = await schedule.add({
          type: 'VACATION_START',
          status: ScheduleStatus.PENDING,
          runAt: startDate,
          relatedId: vacationId,
          relatedTable: 'vacations',
        })
        if (!addStartRes.ok) {
          throw new Error(addStartRes.error.message)
        }

        const addEndRes = await schedule.add({
          type: 'VACATION_END',
          status: ScheduleStatus.PENDING,
          runAt: endDate,
          relatedId: vacationId,
          relatedTable: 'vacations',
        })
        if (!addEndRes.ok) {
          throw new Error(addEndRes.error.message)
        }
      })

      if (!vacationId) throw new Error('Unreachable')

      return { ok: true, value: vacationId as number } as const
    } catch (error: unknown) {
      this.#logger.error(error instanceof Error ? error.message : String(error))
      return errorResult('Internal', 'Transaction error')
    }
  }

  async cancel(vacationId: number) {
    const getRes = await this.vacationRepo.get(vacationId)
    if (!getRes.ok) {
      return getRes
    }
    const vacations = getRes.value

    if (!vacations) return errorResult('NotFound', 'vacation not found')

    let removedId: number | null = null

    try {
      await this.scheduleRepo.transaction(async (tx) => {
        const removeTasksRes = await this.scheduleRepo
          .withTransaction(tx)
          .removeByRelatedId(vacationId, 'vacations')
        if (!removeTasksRes.ok) {
          throw new Error(removeTasksRes.error.message)
        }
        removedId = removeTasksRes.value

        const removeVacationRes = await this.vacationRepo.withTransaction(tx).remove(vacationId)
        if (!removeVacationRes.ok) {
          throw new Error(removeVacationRes.error.message)
        }
      })

      if (!removedId) throw new Error('Unreachable')

      return { ok: true, value: removedId } as const
    } catch (error: unknown) {
      this.#logger.error(error instanceof Error ? error.message : String(error))
      return errorResult('Internal', 'internal error')
    }
  }
}
