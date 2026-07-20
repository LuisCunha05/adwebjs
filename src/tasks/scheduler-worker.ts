import {
  auditRepository,
  authService,
  scheduleRepository,
  vacationRepository,
} from '../services/container'
import { type ScheduledTask, ScheduleStatus } from '../types/schedule'
import { errorResult } from '../utils/error'
import { retryResult } from '../utils/retry'

const MAX_ATTEMPTS = 3

function parseAttempts(errorStr?: string): number {
  if (!errorStr) return 0
  const match = errorStr.match(/^\[Attempts: (\d+)\]/)
  return match ? Number.parseInt(match[1], 10) : 1
}

function formatErrorAttempts(task: ScheduledTask, newError: string): string {
  const currentAttempts = parseAttempts(task.error)
  const nextAttempt = currentAttempts + 1
  return `[Attempts: ${nextAttempt}] ${newError}`
}

export const scheduleVacation = async () => {
  const now = new Date()

  console.log(`[Worker] Task started at ${now.toISOString()}`)

  // Query: no retry
  const listRes = await scheduleRepository.listPending(now, 'vacations')
  if (!listRes.ok) {
    console.error(`[Worker] Failed to list pending tasks: ${listRes.error.message}`)
    return
  }

  const toRun = listRes.value

  if (toRun.length === 0) {
    return
  }

  console.log(`[Worker] Found ${toRun.length} pending/failed actions.`)

  for (const a of toRun) {
    const attempts = parseAttempts(a.error)
    if (a.status === ScheduleStatus.FAILED && attempts >= MAX_ATTEMPTS) {
      console.log(`[Worker] Task ${a.id} has reached max attempts (${attempts}). Skipping.`)
      continue
    }

    if (a.relatedTable !== 'vacations') {
      console.warn(`[Worker] Unknown related table: ${a.relatedTable}`)
      continue
    }

    // Query: no retry
    const getRes = await vacationRepository.get(a.relatedId)
    if (!getRes.ok) {
      console.error(
        `[Worker] Database error fetching vacation for task ${a.id}: ${getRes.error.message}`,
      )
      await retryResult(() =>
        scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: formatErrorAttempts(a, `Database error: ${getRes.error.message}`),
        }),
      )
      continue
    }

    const vacation = getRes.value
    if (!vacation) {
      console.error(`[Worker] Vacation Not Found for task ${a.id} (relatedId=${a.relatedId})`)
      await retryResult(() =>
        scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: formatErrorAttempts(a, 'Related vacation not found'),
        }),
      )
      continue
    }

    const userId = vacation.userId
    if (!userId) {
      await retryResult(() =>
        scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: formatErrorAttempts(a, 'User ID missing'),
        }),
      )
      continue
    }

    if (a.type !== 'VACATION_START' && a.type !== 'VACATION_END') {
      console.warn(`[Worker] Unknown task type: ${a.type}`)
      await retryResult(() =>
        scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: formatErrorAttempts(a, `Unknown task type: ${a.type}`),
        }),
      )
      continue
    }

    console.log(`[Worker] Processing ${a.type} for ${userId} (id=${a.id}, attempt ${attempts + 1})`)

    // Mutation: needs retry
    const jobRes =
      a.type === 'VACATION_START'
        ? await retryResult(() => authService.disableUser(userId))
        : await retryResult(() => authService.enableUser(userId))

    const actionType =
      a.type === 'VACATION_START' ? 'vacation.execute_disable' : 'vacation.execute_enable'

    if (!jobRes.ok) {
      console.error(`[Worker] Failed task ${a.id} to run: ${jobRes.error.message}`)
      const errorMsg = formatErrorAttempts(a, jobRes.error.message)

      // Transaction: status update + audit log
      const txResult = await retryResult(async () => {
        try {
          await scheduleRepository.transaction(async (tx) => {
            const scheduleTx = scheduleRepository.withTransaction(tx)
            const auditTx = auditRepository.withTransaction(tx)

            const updateRes = await scheduleTx.updateStatus(a.id, ScheduleStatus.FAILED, {
              error: errorMsg,
            })
            if (!updateRes.ok) {
              throw new Error(updateRes.error.message)
            }

            await auditTx.create({
              action: actionType,
              actor: 'system',
              target: userId,
              details: {
                runAt: a.runAt,
                scheduleId: a.id,
                relatedId: a.relatedId,
                attempts: parseAttempts(errorMsg),
              },
              success: false,
              error: jobRes.error.message,
            })
          })
          return { ok: true, value: null }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Transaction failed'
          return errorResult('Internal', msg)
        }
      })

      if (!txResult.ok) {
        console.error(
          `[Worker] Transaction failed updating failed status: ${txResult.error.message}`,
        )
      }
      continue
    }

    console.log(`[Worker] Executed ${a.type} for ${userId} (id=${a.id})`)

    // Transaction: status update + audit log
    const txResult = await retryResult(async () => {
      try {
        await scheduleRepository.transaction(async (tx) => {
          const scheduleTx = scheduleRepository.withTransaction(tx)
          const auditTx = auditRepository.withTransaction(tx)

          const updateRes = await scheduleTx.updateStatus(a.id, ScheduleStatus.COMPLETED, {
            executedAt: new Date().toISOString(),
          })
          if (!updateRes.ok) {
            throw new Error(updateRes.error.message)
          }

          await auditTx.create({
            action: actionType,
            actor: 'system',
            target: userId,
            details: { runAt: a.runAt, scheduleId: a.id, relatedId: a.relatedId },
            success: true,
          })
        })
        return { ok: true, value: null }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction failed'
        return errorResult('Internal', msg)
      }
    })

    if (!txResult.ok) {
      console.error(
        `[Worker] Transaction failed updating completed status: ${txResult.error.message}`,
      )
    }
  }
}
