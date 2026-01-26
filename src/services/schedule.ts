import fs from 'fs';
import path from 'path';
import * as ldap from './ldap';
import * as audit from './audit';

/** Pasta onde fica o JSON de agendamentos. Use SCHEDULE_DATA_DIR no .env para customizar (caminho absoluto ou relativo ao cwd). */
const DATA_DIR = process.env.SCHEDULE_DATA_DIR
    ? path.isAbsolute(process.env.SCHEDULE_DATA_DIR)
        ? process.env.SCHEDULE_DATA_DIR
        : path.join(process.cwd(), process.env.SCHEDULE_DATA_DIR)
    : path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'scheduled-actions.json');

export interface ScheduledAction {
    id: string;
    type: 'disable' | 'enable';
    userId: string;
    runAt: string;
    createdAt: string;
    meta?: {
        vacationId?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
    };
}

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function load(): ScheduledAction[] {
    ensureDataDir();
    if (!fs.existsSync(FILE_PATH)) return [];
    try {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        const arr = JSON.parse(raw || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function save(actions: ScheduledAction[]): void {
    ensureDataDir();
    fs.writeFileSync(FILE_PATH, JSON.stringify(actions, null, 2), 'utf-8');
}

let runnerHandle: ReturnType<typeof setInterval> | null = null;

export function addVacation(userId: string, startDate: string, endDate: string): { disableId: string; enableId: string } {
    const actions = load();
    const vacationId = `v-${userId}-${startDate}-${endDate}-${Date.now()}`;
    const disableId = `disable-${vacationId}`;
    const enableId = `enable-${vacationId}`;
    const meta = { vacationId, startDate, endDate, description: `Férias ${userId}` };
    actions.push({
        id: disableId,
        type: 'disable',
        userId,
        runAt: new Date(startDate).toISOString(),
        createdAt: new Date().toISOString(),
        meta,
    });
    actions.push({
        id: enableId,
        type: 'enable',
        userId,
        runAt: new Date(endDate).toISOString(),
        createdAt: new Date().toISOString(),
        meta,
    });
    save(actions);
    return { disableId, enableId };
}

export function list(): ScheduledAction[] {
    const now = new Date().toISOString();
    return load().filter((a) => a.runAt >= now).sort((a, b) => a.runAt.localeCompare(b.runAt));
}

export function listAll(): ScheduledAction[] {
    return load().sort((a, b) => a.runAt.localeCompare(b.runAt));
}

export function remove(id: string): boolean {
    const actions = load().filter((a) => a.id !== id);
    if (actions.length === load().length) return false;
    save(actions);
    return true;
}

/** Remove all actions that belong to the same vacation (same vacationId in meta). */
export function removeVacation(vacationId: string): number {
    const actions = load();
    const next = actions.filter((a) => a.meta?.vacationId !== vacationId);
    const removed = actions.length - next.length;
    if (removed > 0) save(next);
    return removed;
}

async function runDueActions(): Promise<void> {
    const actions = load();
    const now = new Date();
    const toRun = actions.filter((a) => new Date(a.runAt) <= now);
    if (toRun.length === 0) return;
    const remaining = actions.filter((a) => new Date(a.runAt) > now);
    for (const a of toRun) {
        try {
            if (a.type === 'disable') {
                await ldap.disableUser(a.userId);
                audit.log({
                    action: 'vacation.execute_disable',
                    actor: 'system',
                    target: a.userId,
                    details: { runAt: a.runAt, scheduleId: a.id, ...a.meta },
                    success: true,
                });
            } else {
                await ldap.enableUser(a.userId);
                audit.log({
                    action: 'vacation.execute_enable',
                    actor: 'system',
                    target: a.userId,
                    details: { runAt: a.runAt, scheduleId: a.id, ...a.meta },
                    success: true,
                });
            }
            console.log(`[Schedule] Executed ${a.type} for ${a.userId} (id=${a.id})`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Schedule] Failed ${a.type} for ${a.userId}:`, err);
            audit.log({
                action: a.type === 'disable' ? 'vacation.execute_disable' : 'vacation.execute_enable',
                actor: 'system',
                target: a.userId,
                details: { scheduleId: a.id, ...a.meta },
                success: false,
                error: msg,
            });
        }
    }
    save(remaining);
}

export function startRunner(intervalMs: number = 60_000): void {
    if (runnerHandle) return;
    ensureDataDir();
    console.log(`[Schedule] Agendamentos em: ${FILE_PATH}`);
    runDueActions();
    runnerHandle = setInterval(runDueActions, intervalMs);
    console.log(`[Schedule] Runner started (interval ${intervalMs}ms)`);
}

export function stopRunner(): void {
    if (runnerHandle) {
        clearInterval(runnerHandle);
        runnerHandle = null;
    }
}
