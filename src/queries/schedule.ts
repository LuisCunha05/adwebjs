import 'server-only'
import { cache } from 'react'
import { listUsersCached } from '@/queries/ldap'
import { getSessionCached } from '@/queries/session'
import { scheduleService, vacationService } from '@/services/container'
import type { InternalError } from '@/types/error'
import type { ScheduledTask } from '@/types/schedule'
import type { Result } from '@/types/utils'
import type { Vacation } from '@/types/vacation'
import { errorResult } from '@/utils/error'

export const listScheduleCached = cache(
  async (): Promise<Result<ScheduledTask[], InternalError>> => {
    await getSessionCached()
    const res = await scheduleService.list()
    if (!res.ok) return res
    return { ok: true, value: res.value }
  },
)

export const listVacationsCached = cache(async (): Promise<Result<Vacation[], InternalError>> => {
  await getSessionCached()
  const res = await vacationService.list()
  if (!res.ok) return res
  return { ok: true, value: res.value }
})

export async function listSchedulePaginated(filters: {
  page: number
  limit: number
  person?: string
  startDate?: string
  endDate?: string
}): Promise<
  Result<
    {
      tasks: (ScheduledTask & { userId: string; displayName: string })[]
      total: number
      page: number
      limit: number
    },
    InternalError
  >
> {
  await getSessionCached()

  try {
    const [userResult, vacationResult] = await Promise.all([
      listUsersCached(),
      listVacationsCached(),
    ])

    const users = userResult.ok ? userResult.value : []
    const vacations = vacationResult.ok ? vacationResult.value : []

    let vacationIds: number[] | undefined

    if (filters.person) {
      const lowerPerson = filters.person.toLowerCase()
      const matchingUsers = users.filter(
        (u) =>
          u.sAMAccountName.toLowerCase().includes(lowerPerson) ||
          u.displayName?.toLowerCase().includes(lowerPerson) ||
          u.cn?.toLowerCase().includes(lowerPerson),
      )
      const matchingUserIds = matchingUsers.map((u) => u.sAMAccountName)
      const matchingVacations = vacations.filter((v) => matchingUserIds.includes(v.userId))
      vacationIds = matchingVacations.map((v) => v.id)
    }

    const startParsed = filters.startDate ? new Date(filters.startDate) : undefined
    const endParsed = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined

    const skip = (filters.page - 1) * filters.limit
    const take = filters.limit

    const scheduleRes = await scheduleService.listPaginated({
      skip,
      take,
      vacationIds,
      startDate: startParsed,
      endDate: endParsed,
    })

    if (!scheduleRes.ok) {
      return scheduleRes
    }

    const { tasks, total } = scheduleRes.value

    const enrichedTasks = tasks.map((task) => {
      const vacation =
        task.relatedTable === 'vacations'
          ? vacations.find((v) => v.id === task.relatedId)
          : undefined
      const userId = vacation?.userId || ''
      const user = users.find((u) => u.sAMAccountName === userId)
      const displayName = user ? user.displayName || user.cn || userId : userId

      return {
        ...task,
        userId,
        displayName,
      }
    })

    return {
      ok: true,
      value: {
        tasks: enrichedTasks,
        total,
        page: filters.page,
        limit: filters.limit,
      },
    }
  } catch (_err: unknown) {
    return errorResult(
      'Internal',
      'An error occurred while retrieving the paginated schedule list.',
    )
  }
}

export async function listScheduleAllFiltered(filters: {
  person?: string
  startDate?: string
  endDate?: string
}): Promise<Result<(ScheduledTask & { userId: string; displayName: string })[], InternalError>> {
  await getSessionCached()

  try {
    const [userResult, vacationResult] = await Promise.all([
      listUsersCached(),
      listVacationsCached(),
    ])

    const users = userResult.ok ? userResult.value : []
    const vacations = vacationResult.ok ? vacationResult.value : []

    let vacationIds: number[] | undefined

    if (filters.person) {
      const lowerPerson = filters.person.toLowerCase()
      const matchingUsers = users.filter(
        (u) =>
          u.sAMAccountName.toLowerCase().includes(lowerPerson) ||
          u.displayName?.toLowerCase().includes(lowerPerson) ||
          u.cn?.toLowerCase().includes(lowerPerson),
      )
      const matchingUserIds = matchingUsers.map((u) => u.sAMAccountName)
      const matchingVacations = vacations.filter((v) => matchingUserIds.includes(v.userId))
      vacationIds = matchingVacations.map((v) => v.id)
    }

    const startParsed = filters.startDate ? new Date(filters.startDate) : undefined
    const endParsed = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined

    const scheduleRes = await scheduleService.listPaginated({
      vacationIds,
      startDate: startParsed,
      endDate: endParsed,
    })

    if (!scheduleRes.ok) {
      return scheduleRes
    }

    const { tasks } = scheduleRes.value

    const enrichedTasks = tasks.map((task) => {
      const vacation =
        task.relatedTable === 'vacations'
          ? vacations.find((v) => v.id === task.relatedId)
          : undefined
      const userId = vacation?.userId || ''
      const user = users.find((u) => u.sAMAccountName === userId)
      const displayName = user ? user.displayName || user.cn || userId : userId

      return {
        ...task,
        userId,
        displayName,
      }
    })

    return {
      ok: true,
      value: enrichedTasks,
    }
  } catch (_err: unknown) {
    return errorResult('Internal', 'An error occurred while retrieving the filtered schedule list.')
  }
}
