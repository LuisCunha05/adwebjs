import type { IScheduleRepository, ScheduledTask } from '../types/schedule'

export class ScheduleService {
  constructor(private scheduleRepo: IScheduleRepository) {}

  list(): ScheduledTask[] {
    return this.scheduleRepo.listAll()
  }

  remove(id: number): boolean {
    return this.scheduleRepo.remove(id)
  }
}
