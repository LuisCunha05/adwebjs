import { PrismaPg } from '@prisma/adapter-pg'
import { DATABASE_URL } from '../constants/config'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL })

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

import type { DatabaseClient } from '../types/database'

export async function executeTx<T>(
  client: DatabaseClient,
  operation: (tx: DatabaseClient) => Promise<T>,
): Promise<T> {
  if ('$transaction' in client) {
    return (await client.$transaction(operation)) as T
  }
  return await operation(client)
}
