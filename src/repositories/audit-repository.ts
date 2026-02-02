import { AuditEntry, AuditListFilters } from '../types/audit';
import { IDatabase } from '../types/database';

export class AuditRepository {
    constructor(private db: IDatabase) { }

    create(entry: Omit<AuditEntry, 'id'>): void {
        const sql = `
            INSERT INTO audit_logs (at, action, actor, target, details, success, error)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const stmt = this.db.prepare(sql);
        stmt.run(
            entry.at,
            entry.action,
            entry.actor,
            entry.target || null,
            entry.details ? JSON.stringify(entry.details) : null,
            entry.success ? 1 : 0,
            entry.error || null
        );
    }

    list(filters: AuditListFilters): AuditEntry[] {
        let sql = `SELECT * FROM audit_logs`;
        const conditions: string[] = [];
        const params: any[] = [];

        if (filters.since) {
            conditions.push(`at >= ?`);
            params.push(filters.since);
        }
        if (filters.until) {
            conditions.push(`at <= ?`);
            params.push(filters.until);
        }
        if (filters.action) {
            conditions.push(`action = ?`);
            params.push(filters.action);
        }
        if (filters.actor) {
            conditions.push(`actor = ?`);
            params.push(filters.actor);
        }
        if (filters.target) {
            conditions.push(`target LIKE ?`);
            params.push(`%${filters.target}%`);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        sql += ` ORDER BY at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(filters.limit);
        }

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params) as any[];

        return rows.map(row => ({
            id: row.id,
            at: row.at,
            action: row.action,
            actor: row.actor,
            target: row.target,
            details: row.details ? JSON.parse(row.details) : undefined,
            success: Boolean(row.success),
            error: row.error
        }));
    }
}
