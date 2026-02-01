import fs from 'fs';
import path from 'path';

/** Pasta onde fica o JSON de auditoria. Usa SCHEDULE_DATA_DIR ou data/ por padrão. */
import { SCHEDULE_DATA_DIR } from '../contants/config';

const DATA_DIR = SCHEDULE_DATA_DIR;
const FILE_PATH = path.join(DATA_DIR, 'audit-log.json');

export type AuditAction =
    | 'user.create'
    | 'user.delete'
    | 'user.disable'
    | 'user.enable'
    | 'user.unlock'
    | 'user.update'
    | 'user.reset_password'
    | 'user.move'
    | 'vacation.schedule'
    | 'vacation.cancel'
    | 'vacation.execute_disable'
    | 'vacation.execute_enable'
    | 'group.member_add'
    | 'group.member_remove'
    | 'group.update';

export interface AuditEntry {
    id: string;
    at: string;
    action: AuditAction;
    actor: string;
    target?: string;
    details?: Record<string, unknown>;
    success: boolean;
    error?: string;
}

const MAX_ENTRIES = 50_000;

function ensureDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function load(): AuditEntry[] {
    ensureDir();
    if (!fs.existsSync(FILE_PATH)) return [];
    try {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        const arr = JSON.parse(raw || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function save(entries: AuditEntry[]): void {
    ensureDir();
    const trimmed = entries.slice(-MAX_ENTRIES);
    fs.writeFileSync(FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function nextId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Registra um evento de auditoria. actor = sAMAccountName de quem fez a ação ou "system" para jobs.
 */
export function log(params: {
    action: AuditAction;
    actor: string;
    target?: string;
    details?: Record<string, unknown>;
    success: boolean;
    error?: string;
}): void {
    const entry: AuditEntry = {
        id: nextId(),
        at: new Date().toISOString(),
        action: params.action,
        actor: params.actor,
        target: params.target,
        details: params.details,
        success: params.success,
        error: params.error,
    };
    const entries = load();
    entries.push(entry);
    save(entries);
}

export interface AuditListFilters {
    since?: string;
    until?: string;
    action?: AuditAction | string;
    actor?: string;
    target?: string;
    limit?: number;
}

export function list(filters: AuditListFilters = {}): AuditEntry[] {
    let entries = load();
    const { since, until, action, actor, target, limit = 500 } = filters;
    if (since) {
        const t = new Date(since).getTime();
        entries = entries.filter((e) => new Date(e.at).getTime() >= t);
    }
    if (until) {
        const t = new Date(until).getTime();
        entries = entries.filter((e) => new Date(e.at).getTime() <= t);
    }
    if (action) entries = entries.filter((e) => e.action === action);
    if (actor) entries = entries.filter((e) => e.actor === actor);
    if (target) entries = entries.filter((e) => e.target && String(e.target).toLowerCase().includes(String(target).toLowerCase()));
    entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return entries.slice(0, limit);
}

export function getFilePath(): string {
    return FILE_PATH;
}
