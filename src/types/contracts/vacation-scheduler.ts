export interface IVacationScheduler {
    schedule(userId: string, startDate: string, endDate: string): number;
}
