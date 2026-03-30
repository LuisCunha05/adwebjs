import {
  auditService,
  ldapService,
  scheduleRepository,
  vacationRepository,
} from '../services/container'
import { ScheduleStatus } from '../types/schedule'

export const scheduleVacation = async () => {
  const now = new Date()

  console.log(`[Worker] Task started at ${now.toISOString()}`)

  // listPending typically returns actions where runAt <= now AND status == PENDING
  const toRun = await scheduleRepository.listPending(now)

  if (toRun.length === 0) {
    return
  }

  console.log(`[Worker] Found ${toRun.length} pending actions.`)

  for (const a of toRun) {
    try {
      let userId: string | undefined

      if (a.relatedTable === 'vacations') {
        const vacation = await vacationRepository.get(a.relatedId)
        if (vacation) {
          userId = vacation.userId
        } else {
          console.error(`[Worker] Vacation Not Found for task ${a.id} (relatedId=${a.relatedId})`)
          await scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
            error: 'Related vacation not found',
          })
          continue
        }
      } else {
        console.warn(`[Worker] Unknown related table: ${a.relatedTable}`)
        await scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: 'Unknown related table',
        })
        continue
      }

      if (!userId) {
        await scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, {
          error: 'User ID missing',
        })
        continue
      }

      console.log(`[Worker] Processing ${a.type} for ${userId} (id=${a.id})`)

      if (a.type === 'VACATION_START') {
        await ldapService.disableUser(userId)
        await auditService.log({
          action: 'vacation.execute_disable',
          actor: 'system',
          target: userId,
          details: { runAt: a.runAt, scheduleId: a.id, relatedId: a.relatedId },
          success: true,
        })
      } else if (a.type === 'VACATION_END') {
        await ldapService.enableUser(userId)
        await auditService.log({
          action: 'vacation.execute_enable',
          actor: 'system',
          target: userId,
          details: { runAt: a.runAt, scheduleId: a.id, relatedId: a.relatedId },
          success: true,
        })
      } else {
        console.warn(`[Worker] Unknown task type: ${a.type}`)
      }

      console.log(`[Worker] Executed ${a.type} for ${userId} (id=${a.id})`)
      await scheduleRepository.updateStatus(a.id, ScheduleStatus.COMPLETED, {
        executedAt: new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Worker] Failed task ${a.id}:`, err)

      // We might not have userId here if fetching vacation failed, but we try access it safely or skip logging user specific if unavailable
      // For simplicity logging what we can

      await scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, { error: msg })
    }
  }
}
