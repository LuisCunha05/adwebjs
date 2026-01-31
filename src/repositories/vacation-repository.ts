import { IDatabase } from '../infrastructure/database-interface';
import { IVacationRepository, Vacation } from '../services/interfaces';

export class VacationRepository implements IVacationRepository {
    constructor(private db: IDatabase) { }

    add(vacation: Omit<Vacation, 'id' | 'createdAt'>): number {
        const createdAt = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO vacations (user_id, start_date, end_date, description, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
        `);
        const result = stmt.all(
            vacation.userId,
            vacation.startDate,
            vacation.endDate,
            vacation.description || null,
            createdAt
        ) as { id: number | bigint }[];

        if (result.length === 0) throw new Error('Failed to insert vacation');
        return Number(result[0].id);
    }

    get(id: number): Vacation | undefined {
        const stmt = this.db.prepare('SELECT * FROM vacations WHERE id = ?');
        const row = stmt.get(id) as any;
        if (!row) return undefined;
        return {
            id: row.id,
            userId: row.user_id,
            startDate: row.start_date,
            endDate: row.end_date,
            description: row.description || undefined,
            createdAt: row.created_at
        };
    }

    remove(id: number): void {
        const stmt = this.db.prepare('DELETE FROM vacations WHERE id = ?');
        stmt.run(id);
    }
}
