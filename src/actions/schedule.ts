'use server'

import { z } from 'zod'
import { getSessionCached } from '@/queries/session'
import { auditService, scheduleService, vacationScheduleService } from '@/services/container'
import type {
  InternalError,
  InvalidShapeError,
  NotFoundError,
  UnauthorizedError,
} from '@/types/error'
import type { ActionResult, Result } from '@/types/utils'
import { errorActionResult, errorResult } from '@/utils/error'
import { CreateVacationSchema ,CreateVacationForm} from '@/schemas/schedule'

export async function createVacation(
  _prevState: ActionResult<
    CreateVacationForm,
    InternalError | UnauthorizedError | InvalidShapeError
  > | null,
  formData: FormData,
): Promise<
  ActionResult<CreateVacationForm, InternalError | UnauthorizedError | InvalidShapeError>
> {
  // 1. Authorization check
  await getSessionCached()

  const userId = formData.get('userId')?.toString() || ''
  const startDate = formData.get('startDate')?.toString() || ''
  const endDate = formData.get('endDate')?.toString() || ''

  const state = { userId, startDate, endDate }

  // 2. Input validation
  const validation = CreateVacationSchema.safeParse({ userId, startDate, endDate })

  if (!validation.success) {
    return errorActionResult(state, 'InvalidShape', validation.error.issues[0].message)
  }

  // 3. Execution
  const vacationResult = await vacationScheduleService.schedule(
    validation.data.userId,
    validation.data.startDate,
    validation.data.endDate,
  )

  if (!vacationResult.ok) {
    await auditService.log({
      action: 'vacation.schedule',
      actor: 'server-action',
      target: validation.data.userId,
      details: { startDate: validation.data.startDate, endDate: validation.data.endDate },
      success: false,
      error: vacationResult.error.message,
    })
    return errorActionResult(state, 'Internal', 'Agendamento de férias falhou.')
  }

  const vacationId = vacationResult.value

  await auditService.log({
    action: 'vacation.schedule',
    actor: 'server-action',
    target: validation.data.userId,
    details: { startDate: validation.data.startDate, endDate: validation.data.endDate, vacationId },
    success: true,
  })

  return { ok: true, state:{endDate: "",  startDate: "", userId:""} }
}

export async function cancelTask(
  id: number,
): Promise<Result<void, InternalError | UnauthorizedError | NotFoundError>> {
  await getSessionCached()
  if (Number.isNaN(id)) {
    return errorResult('Internal', 'ID inválido')
  }
  try {
    const removed = await scheduleService.remove(id)
    if (!removed) {
      return errorResult('NotFound', 'Agendamento não encontrado')
    }
    return { ok: true, value: undefined }
  } catch (err: unknown) {
    return errorResult('Internal', err instanceof Error ? err.message : 'Cancelamento falhou')
  }
}
