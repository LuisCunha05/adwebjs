
export enum ScheduleStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}
// Entities

export interface ScheduledTask {
    id: number;
    type: string; // 'VACATION_START', 'VACATION_END', etc.
    status: ScheduleStatus;
    runAt: string;
    relatedId: number;
    relatedTable: string;
    createdAt: string;
    executedAt?: string;
    error?: string;
}

export interface IScheduleRepository {
    add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): number;
    listPending(maxDate?: Date): ScheduledTask[];
    listAll(): ScheduledTask[];
    updateStatus(id: number, status: ScheduleStatus, details?: { error?: string; executedAt?: string; }): void;
    remove(id: number): boolean;
    removeByRelatedId(relatedId: number, relatedTable: string): number;
}
