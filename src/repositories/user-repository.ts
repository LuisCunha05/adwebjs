import { IDatabase } from '../types/database';
import { IUserRepository } from '../types/user';
import { LocalUser } from '../types/user';
import { Group } from '../types/group';

export class SqliteUserRepository implements IUserRepository {
    private db: IDatabase;

    constructor(db: IDatabase) {
        this.db = db;
    }

    async create(username: string, name: string): Promise<LocalUser> {
        const stmt = this.db.prepare('INSERT INTO users (username, name) VALUES (?, ?) RETURNING *');
        return stmt.get(username, name) as LocalUser;
    }

    async delete(userId: number): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(userId);
    }

    async getByUsername(username: string): Promise<LocalUser | null> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username) as LocalUser | undefined;
        if (!user) return null;

        // Fetch Groups
        const groupsStmt = this.db.prepare(`
            SELECT g.* FROM groups g
            JOIN user_groups ug ON g.id = ug.group_id
            WHERE ug.user_id = ?
        `);
        user.groups = groupsStmt.all(user.id) as Group[];
        return user;
    }

    async getAll(): Promise<LocalUser[]> {
        const stmt = this.db.prepare('SELECT * FROM users ORDER BY username ASC');
        return stmt.all() as LocalUser[];
    }

    async assignGroup(userId: number, groupId: number): Promise<void> {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)');
        stmt.run(userId, groupId);
    }

    async removeGroup(userId: number, groupId: number): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?');
        stmt.run(userId, groupId);
    }

    async getUserPermissionSlugs(username: string): Promise<string[]> {
        // Optimized query to get all distinct permission slugs for a user
        const stmt = this.db.prepare(`
            SELECT DISTINCT p.slug
            FROM permissions p
            JOIN group_permissions gp ON p.id = gp.permission_id
            JOIN groups g ON gp.group_id = g.id
            JOIN user_groups ug ON g.id = ug.group_id
            JOIN users u ON ug.user_id = u.id
            WHERE u.username = ?
        `);

        const rows = stmt.all(username) as { slug: string }[];
        return rows.map(r => r.slug);
    }
}
