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
