import { IDatabase } from '../infrastructure/database-interface';
import { IScheduleRepository, ScheduledTask, ScheduleStatus } from '../services/interfaces';

export class ScheduleRepository implements IScheduleRepository {
    constructor(private db: IDatabase) { }

    add(task: Omit<ScheduledTask, 'id' | 'createdAt'>): number {
        const createdAt = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO scheduled_tasks (type, status, run_at, related_id, related_table, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
        `);
        const result = stmt.all(
            task.type,
            task.status,
            task.runAt,
            task.relatedId,
            task.relatedTable,
            createdAt
        ) as { id: number | bigint }[];

        if (result.length === 0) throw new Error('Failed to insert task');
        return Number(result[0].id);
    }

    listPending(maxDate: Date = new Date()): ScheduledTask[] {
        const stmt = this.db.prepare(`
            SELECT * FROM scheduled_tasks
            WHERE status = ? AND run_at <= ?
            ORDER BY run_at ASC
        `);
        const rows = stmt.all(ScheduleStatus.PENDING, maxDate.toISOString()) as any[];
        return rows.map(this.mapRowToTask);
    }

    listAll(): ScheduledTask[] {
        const stmt = this.db.prepare(`
            SELECT * FROM scheduled_tasks
            ORDER BY run_at ASC
        `);
        const rows = stmt.all() as any[];
        return rows.map(this.mapRowToTask);
    }

    updateStatus(id: number, status: ScheduleStatus, details?: { error?: string, executedAt?: string }): void {
        const stmt = this.db.prepare(`
            UPDATE scheduled_tasks 
            SET status = ?, error = ?, executed_at = ?
            WHERE id = ?
        `);

        let errorVal = details?.error || null;
        let executedAtVal = details?.executedAt || null;

        stmt.run(status, errorVal, executedAtVal, id);
    }

    remove(id: number): boolean {
        const stmt = this.db.prepare('DELETE FROM scheduled_tasks WHERE id = ?');
        const result = stmt.run(id);
        return Number(result.changes) > 0;
    }

    removeByRelatedId(relatedId: number, relatedTable: string): number {
        const stmt = this.db.prepare('DELETE FROM scheduled_tasks WHERE related_id = ? AND related_table = ?');
        const result = stmt.run(relatedId, relatedTable);
        return Number(result.changes);
    }

    private mapRowToTask(row: any): ScheduledTask {
        return {
            id: row.id,
            type: row.type,
            status: row.status as ScheduleStatus,
            runAt: row.run_at,
            relatedId: row.related_id,
            relatedTable: row.related_table,
            createdAt: row.created_at,
            executedAt: row.executed_at || undefined,
            error: row.error || undefined,
        };
    }
}
