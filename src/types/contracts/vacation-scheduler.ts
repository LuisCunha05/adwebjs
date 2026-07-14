import type { InternalError, NotFoundError } from '../error'
import type { Result } from '../utils'

export interface IVacationScheduler {
  schedule(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Result<number, InternalError | NotFoundError>>
  cancel?(vacationId: number): Promise<Result<number, InternalError | NotFoundError>>
}
