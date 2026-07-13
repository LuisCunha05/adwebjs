'use server'

import { getSessionCached } from '@/queries/session'
import { auditService, scheduleService, vacationScheduleService } from '@/services/container'
import type { ScheduledTask } from '@/types/schedule'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function listSchedule(): Promise<ActionResult<ScheduledTask[]>> {
  await getSessionCached()
  try {
    const actions = await scheduleService.list()
    return { ok: true, data: JSON.parse(JSON.stringify(actions)) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Schedule list failed' }
  }
}

export async function createVacation(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ActionResult<{ vacationId: number }>> {
  await getSessionCached()
  if (!userId || !startDate || !endDate) return { ok: false, error: 'Missing required fields' }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, error: 'Invalid dates' }
  }

  const vacationResult = await vacationScheduleService.schedule(String(userId), startDate, endDate)

  if (!vacationResult.ok) {
    await auditService.log({
      action: 'vacation.schedule',
      actor: 'server-action',
      target: String(userId),
      details: { startDate, endDate },
      success: false,
      error: vacationResult.error.message,
    })
    return { ok: false, error: 'Schedule vacation failed' }
  }

  const vacationId = vacationResult.value

  await auditService.log({
    action: 'vacation.schedule',
    actor: 'server-action',
    target: String(userId),
    details: { startDate, endDate, vacationId },
    success: true,
  })
  return { ok: true, data: { vacationId } }
}

export async function cancelTask(id: number): Promise<ActionResult> {
  await getSessionCached()
  if (Number.isNaN(id)) return { ok: false, error: 'Invalid ID' }
  try {
    const removed = await scheduleService.remove(id)
    if (!removed) return { ok: false, error: 'Scheduled action not found' }
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cancel failed' }
  }
}
