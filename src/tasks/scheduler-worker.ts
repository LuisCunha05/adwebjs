import { ldapService, scheduleRepository, vacationRepository } from '../services/container';
import * as audit from '../services/audit';
import { ScheduleStatus } from '../services/interfaces';

export async function task() {
    // DB Init is handled in container

    // Debug log to verify execution
    console.log(`[Worker] Task started at ${new Date().toISOString()}`);

    const now = new Date();
    // console.log(`[Worker] Checking for due actions at ${now.toISOString()}`); // Reduce noise

    // Check for due actions
    // listPending typically returns actions where runAt <= now AND status == PENDING
    const toRun = scheduleRepository.listPending(now);

    if (toRun.length === 0) {
        // console.log('[Worker] No actions to run.');
        return;
    }

    console.log(`[Worker] Found ${toRun.length} pending actions.`);

    for (const a of toRun) {
        try {
            let userId: string | undefined;
            // let meta: any = {};

            if (a.relatedTable === 'vacations') {
                const vacation = vacationRepository.get(a.relatedId);
                if (vacation) {
                    userId = vacation.userId;
                    // meta = { vacationId: vacation.id, ...vacation };
                } else {
                    console.error(`[Worker] Vacation Not Found for task ${a.id} (relatedId=${a.relatedId})`);
                    scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, { error: 'Related vacation not found' });
                    continue;
                }
            } else {
                console.warn(`[Worker] Unknown related table: ${a.relatedTable}`);
                scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, { error: 'Unknown related table' });
                continue;
            }

            if (!userId) {
                scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, { error: 'User ID missing' });
                continue;
            }

            console.log(`[Worker] Processing ${a.type} for ${userId} (id=${a.id})`);

            if (a.type === 'VACATION_START') {
                await ldapService.disableUser(userId);
                audit.log({
                    action: 'vacation.execute_disable',
                    actor: 'system',
                    target: userId,
                    details: { runAt: a.runAt, scheduleId: a.id, relatedId: a.relatedId },
                    success: true,
                });
            } else if (a.type === 'VACATION_END') {
                await ldapService.enableUser(userId);
                audit.log({
                    action: 'vacation.execute_enable',
                    actor: 'system',
                    target: userId,
                    details: { runAt: a.runAt, scheduleId: a.id, relatedId: a.relatedId },
                    success: true,
                });
            } else {
                console.warn(`[Worker] Unknown task type: ${a.type}`);
            }

            console.log(`[Worker] Executed ${a.type} for ${userId} (id=${a.id})`);
            scheduleRepository.updateStatus(a.id, ScheduleStatus.COMPLETED, { executedAt: new Date().toISOString() });

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Worker] Failed task ${a.id}:`, err);

            // We might not have userId here if fetching vacation failed, but we try access it safely or skip logging user specific if unavailable
            // For simplicity logging what we can

            scheduleRepository.updateStatus(a.id, ScheduleStatus.FAILED, { error: msg });
        }
    }
}
