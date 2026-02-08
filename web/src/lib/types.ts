export type Session = { user: { sAMAccountName: string; cn?: string; mail?: string; userPrincipalName?: string }; isAdmin: boolean; canDelete?: boolean };

export type EditAttribute = { name: string; label: string; section: string };

export enum ScheduleStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface ScheduledTask {
    id: number;
    type: string;
    status: ScheduleStatus;
    runAt: string;
    relatedId: number;
    relatedTable: string;
    createdAt: string;
    executedAt?: string;
    error?: string;
}

export type AuditEntry = {
    id: string;
    at: string;
    action: string;
    actor: string;
    target?: string;
    details?: Record<string, unknown>;
    success: boolean;
    error?: string;
};

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}
