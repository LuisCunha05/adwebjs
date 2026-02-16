'use server'

import { auditService, scheduleService, vacationScheduleService } from '@/services/container'
import type { ScheduledTask } from '@/types/schedule'

import { verifySession } from '@/utils/manage-jwt'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function listSchedule(): Promise<ActionResult<ScheduledTask[]>> {
  await verifySession()
  try {
    const actions = scheduleService.list()
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
  await verifySession()
  if (!userId || !startDate || !endDate) return { ok: false, error: 'Missing required fields' }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, error: 'Invalid dates' }
  }

  try {
    const vacationId = vacationScheduleService.schedule(String(userId), startDate, endDate)
    auditService.log({
      action: 'vacation.schedule',
      actor: 'server-action',
      target: String(userId),
      details: { startDate, endDate, vacationId },
      success: true,
    })
    return { ok: true, data: { vacationId } }
  } catch (err: unknown) {
    auditService.log({
      action: 'vacation.schedule',
      actor: 'server-action',
      target: String(userId),
      details: { startDate, endDate },
      success: false,
      error: err instanceof Error ? err.message : 'Schedule vacation failed',
    })
    return { ok: false, error: err instanceof Error ? err.message : 'Schedule vacation failed' }
  }
}

export async function cancelTask(id: number): Promise<ActionResult> {
  await verifySession()
  if (Number.isNaN(id)) return { ok: false, error: 'Invalid ID' }
  try {
    const removed = scheduleService.remove(id)
    if (!removed) return { ok: false, error: 'Scheduled action not found' }
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cancel failed' }
  }
}
