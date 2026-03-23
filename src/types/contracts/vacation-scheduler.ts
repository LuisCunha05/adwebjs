export interface IVacationScheduler {
  schedule(userId: string, startDate: string, endDate: string): Promise<number>
  cancel?(vacationId: number): Promise<number>
}
