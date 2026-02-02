import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { IDatabase, IStatement } from "../types/database";
import { SCHEDULE_DATA_DIR } from '../contants/config';

export class SqliteDatabase implements IDatabase {
    private db: DatabaseSync;

    constructor() {
        const dataDir = SCHEDULE_DATA_DIR;
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, 'database.sqlite');
        this.db = new DatabaseSync(dbPath);
    }

    init(): void {
        // Enable WAL mode for better concurrency
        this.db.exec('PRAGMA journal_mode = WAL;');
        // Enable foreign key constraints
        this.db.exec('PRAGMA foreign_keys = ON;');

        // Create vacations table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS vacations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            );
        `);

        // Create scheduled_tasks table with polymorphic relationship
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                run_at TEXT NOT NULL,
                related_id INTEGER NOT NULL,
                related_table VARCHAR(50) NOT NULL,
                created_at TEXT NOT NULL,
                executed_at TEXT,
                error TEXT
            );
        `);

        // Create audit_logs table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                at TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                target TEXT,
                details TEXT,
                success INTEGER NOT NULL,
                error TEXT
            );
        `);

        // --- RBAC Tables ---

        // 1. Permissions
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT
            );
        `);

        // 2. Groups
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            );
        `);

        // 3. Group Permissions (Pivot)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS group_permissions (
                group_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, permission_id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
        `);

        // 4. Users (Allow List)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. User Groups (Pivot)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_groups (
                user_id INTEGER NOT NULL,
                group_id INTEGER NOT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, group_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
            );
        `);
    }

    exec(sql: string): void {
        this.db.exec(sql);
    }

    prepare(sql: string): IStatement {
        return this.db.prepare(sql);
    }

    transaction<T>(fn: () => T): T {
        this.db.exec('BEGIN TRANSACTION');
        try {
            const result = fn();
            this.db.exec('COMMIT');
            return result;
        } catch (err) {
            this.db.exec('ROLLBACK');
            throw err;
        }
    }
}
