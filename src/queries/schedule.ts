import 'server-only'
import { cache } from 'react'
import { getSessionCached } from '@/queries/session'
import { scheduleService } from '@/services/container'
import type { InternalError } from '@/types/error'
import type { ScheduledTask } from '@/types/schedule'
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
