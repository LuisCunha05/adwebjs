
export interface AuditEntry {
    id: number;
    at: string;
    action: AuditAction;
    actor: string;
    target?: string;
    details?: Record<string, unknown>;
    success: boolean;
    error?: string;
}

export interface AuditListFilters {
    since?: string;
    until?: string;
    action?: AuditAction;
    actor?: string;
    target?: string;
    limit?: number;

}

export type AuditAction = 'user.create' |
    'user.delete' |
    'user.disable' |
    'user.enable' |
    'user.unlock' |
    'user.update' |
    'user.reset_password' |
    'user.move' |
    'vacation.schedule' |
    'vacation.cancel' |
    'vacation.execute_disable' |
    'vacation.execute_enable' |
    'group.member_add' |
    'group.member_remove' |
    'group.update';

