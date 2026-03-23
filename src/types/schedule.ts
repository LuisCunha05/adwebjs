export enum ScheduleStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
// Entities

export interface ScheduledTask {
  id: number
  type: string // 'VACATION_START', 'VACATION_END', etc.
  status: ScheduleStatus
  runAt: string
  relatedId: number
  relatedTable: string
  createdAt: string
  executedAt?: string
  error?: string
}

export interface IScheduleRepository {
  add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): Promise<number>
  listPending(maxDate?: Date): Promise<ScheduledTask[]>
  listAll(): Promise<ScheduledTask[]>
  updateStatus(
    id: number,
    status: ScheduleStatus,
    details?: { error?: string; executedAt?: string },
  ): Promise<void>
  remove(id: number): Promise<boolean>
  removeByRelatedId(relatedId: number, relatedTable: string): Promise<number>
}
