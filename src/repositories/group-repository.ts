import { IDatabase } from '../types/database';
import { IGroupRepository } from '../types/group';
import { Group } from '../types/group';
import { Permission } from '../types/permission';

export class SqliteGroupRepository implements IGroupRepository {
    private db: IDatabase;

    constructor(db: IDatabase) {
        this.db = db;
    }

    async create(name: string, description?: string): Promise<Group> {
        const stmt = this.db.prepare('INSERT INTO groups (name, description) VALUES (?, ?) RETURNING *');
        const res = stmt.get(name, description || null) as Group;
        return res;
    }

    async updatePermissions(groupId: number, permissionIds: number[]): Promise<void> {
        this.db.transaction(() => {
            // 1. Clear existing
            const deleteStmt = this.db.prepare('DELETE FROM group_permissions WHERE group_id = ?');
            deleteStmt.run(groupId);

            // 2. Add new
            if (permissionIds.length > 0) {
                const insertStmt = this.db.prepare('INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)');
                for (const pid of permissionIds) {
                    insertStmt.run(groupId, pid);
                }
            }
        });
    }

    async delete(groupId: number): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM groups WHERE id = ?');
        stmt.run(groupId);
    }

    async getAll(): Promise<Group[]> {
        const groupsStmt = this.db.prepare('SELECT * FROM groups ORDER BY name ASC');
        return groupsStmt.all() as Group[];
    }

    async getById(id: number): Promise<Group | null> {
        const groupStmt = this.db.prepare('SELECT * FROM groups WHERE id = ?');
        const group = groupStmt.get(id) as Group | undefined;

        if (!group) return null;

        const permsStmt = this.db.prepare(`
            SELECT p.* FROM permissions p
            JOIN group_permissions gp ON p.id = gp.permission_id
            WHERE gp.group_id = ?
        `);
        group.permissions = permsStmt.all(id) as Permission[];

        return group;
    }

    async getByName(name: string): Promise<Group | null> {
        const groupStmt = this.db.prepare('SELECT * FROM groups WHERE name = ?');
        const group = groupStmt.get(name) as Group | undefined;
        if (!group) return null;

        // Populate permissions
        const permsStmt = this.db.prepare(`
            SELECT p.* FROM permissions p
            JOIN group_permissions gp ON p.id = gp.permission_id
            WHERE gp.group_id = ?
        `);
        group.permissions = permsStmt.all(group.id) as Permission[];
        return group;
    }
}
