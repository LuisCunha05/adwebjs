export interface IDatabase {
  exec(sql: string): void
  prepare(sql: string): IStatement
  transaction<T>(fn: () => T): T
}

export interface IStatement {
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint }
  get(...params: any[]): unknown
  all(...params: any[]): unknown[]
}
