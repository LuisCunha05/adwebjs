import type { InternalError } from '@/types/error'
import type { Result } from '@/types/utils'
import type { IScheduleRepository, ScheduledTask } from '../types/schedule'

export class ScheduleService {
  constructor(private scheduleRepo: IScheduleRepository) {}

  async list(): Promise<Result<ScheduledTask[], InternalError>> {
    return await this.scheduleRepo.listAll()
  }

  async listPaginated(params: {
    skip?: number
    take?: number
    vacationIds?: number[]
    startDate?: Date
    endDate?: Date
  }): Promise<Result<{ tasks: ScheduledTask[]; total: number }, InternalError>> {
    return await this.scheduleRepo.listPaginated(params)
  }

  async remove(id: number): Promise<Result<boolean, InternalError>> {
    return await this.scheduleRepo.remove(id)
  }
}
