import type { Result } from '@/types/utils'
import type { InternalError } from '@/types/error'
import { errorResult } from '@/utils/error'
import type { IScheduleRepository, ScheduledTask } from '../types/schedule'

export class ScheduleService {
  constructor(private scheduleRepo: IScheduleRepository) {}

  async list(): Promise<ScheduledTask[]> {
    return await this.scheduleRepo.listAll()
  }

  async listPaginated(params: {
    skip?: number
    take?: number
    vacationIds?: number[]
    startDate?: Date
    endDate?: Date
  }): Promise<Result<{ tasks: ScheduledTask[]; total: number }, InternalError>> {
    try {
      const result = await this.scheduleRepo.listPaginated(params)
      return { ok: true, value: result }
    } catch (err: unknown) {
      return errorResult(
        'Internal',
        err instanceof Error ? err.message : 'Failed to query scheduled tasks',
      )
    }
  }

  async remove(id: number): Promise<boolean> {
    return await this.scheduleRepo.remove(id)
  }
}
