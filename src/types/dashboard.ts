import type { InternalError } from './error'
import type { Result } from './utils'

export interface IDashboard {
  get(): Promise<
    Result<{ usersCount: number; disabledCount: number; groupsCount: number }, InternalError>
  >
}
