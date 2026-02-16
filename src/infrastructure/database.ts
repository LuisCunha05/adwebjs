import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { SCHEDULE_DATA_DIR } from '../constants/config'
import type { IDatabase, IStatement } from '../types/database'

export class SqliteDatabase implements IDatabase {
  private initialized = false
  private _db?: DatabaseSync

  constructor() {
    // Lightweight constructor
  }

  private get db(): DatabaseSync {
    if (!this._db) {
      this.init()
    }
    return this._db!
  }

  init(): void {
    if (this.initialized) return

    const dataDir = SCHEDULE_DATA_DIR
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true })
      } catch (e) {
        console.error('Failed to create data dir', e)
      }
    }

    const dbPath = path.join(dataDir, 'database.sqlite')
    this._db = new DatabaseSync(dbPath)

    this._db.exec('PRAGMA journal_mode = WAL;')

    this._db.exec(`
            CREATE TABLE IF NOT EXISTS vacations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            );
        `)

    this._db.exec(`
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
        `)

    this._db.exec(`
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
        `)

    this.initialized = true
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  prepare(sql: string): IStatement {
    return this.db.prepare(sql)
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN TRANSACTION')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }
}
