import 'server-only'
import { cache } from 'react'
import { getSessionCached } from '@/queries/session'
import { scheduleService, vacationService } from '@/services/container'
import type { InternalError } from '@/types/error'
import type { ScheduledTask } from '@/types/schedule'
import type { Vacation } from '@/types/vacation'
import type { Result } from '@/types/utils'
import { errorResult } from '@/utils/error'

export const listScheduleCached = cache(
  async (): Promise<Result<ScheduledTask[], InternalError>> => {
    await getSessionCached()
    try {
      const actions = await scheduleService.list()
      return { ok: true, value: actions }
    } catch (err: unknown) {
      return errorResult('Internal', err instanceof Error ? err.message : 'Schedule list failed')
    }
  },
)

export const listVacationsCached = cache(
  async (): Promise<Result<Vacation[], InternalError>> => {
    await getSessionCached()
    try {
      const vacations = await vacationService.list()
      return { ok: true, value: vacations }
    } catch (err: unknown) {
      return errorResult('Internal', err instanceof Error ? err.message : 'Vacation list failed')
    }
  },
)
