import { IDatabase } from '../types/database';
import { IPermissionRepository } from '../types/permission';
import { Permission } from '../types/permission';

export class SqlitePermissionRepository implements IPermissionRepository {
    private db: IDatabase;

    constructor(db: IDatabase) {
        this.db = db;
    }

    async ensurePermissionsInternal(perms: { slug: string, name: string, description?: string }[]): Promise<void> {
        this.db.transaction(() => {
            for (const p of perms) {
                const stmt = this.db.prepare(`
                    INSERT INTO permissions (slug, name, description) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description
                `);
                stmt.run(p.slug, p.name, p.description || null);
            }
        });
    }

    async getAll(): Promise<Permission[]> {
        const stmt = this.db.prepare('SELECT * FROM permissions ORDER BY slug ASC');
        return stmt.all() as Permission[];
    }
}
