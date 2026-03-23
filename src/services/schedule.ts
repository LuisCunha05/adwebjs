import type { IScheduleRepository, ScheduledTask } from '../types/schedule'

export class ScheduleService {
  constructor(private scheduleRepo: IScheduleRepository) {}

  async list(): Promise<ScheduledTask[]> {
    return await this.scheduleRepo.listAll()
  }

  async remove(id: number): Promise<boolean> {
    return await this.scheduleRepo.remove(id)
  }
}
