import type { DatabaseClient } from '@/types/database'

export abstract class BaseRepository {
  constructor(protected db: DatabaseClient) {}

  withTransaction(tx: DatabaseClient): this {
    // Creates a new instance of repository using a client that is already in a transaction
    // biome-ignore lint/suspicious/noExplicitAny: Creates a instance of the class
    return new (this.constructor as any)(tx)
  }

  async transaction(operation: (repo: DatabaseClient) => Promise<void>): Promise<void> {
    if ('$transaction' in this.db) {
      return await this.db.$transaction(async (tx) => {
        return await operation(tx)
      })
    }

    return await operation(this.db)
  }
}
