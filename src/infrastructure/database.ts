import postgres, { type PostgresClient } from '@prisma/orm-postgres/runtime'
import { contractFromJson } from '@prisma/orm-postgres/static'
import { DATABASE_URL } from '../constants/config'
import type { DatabaseClient } from '../types/database'
import type { Contract } from './prisma/contract.d'
import contractJson from './prisma/contract.json' with { type: 'json' }

export const contract = contractFromJson<Contract>(contractJson)

const globalForPrisma = globalThis as unknown as {
  prisma?: PostgresClient<Contract>
}

export const db =
  globalForPrisma.prisma ??
  postgres({
    contract,
    url: DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export async function executeTx<T>(
  client: DatabaseClient,
  operation: (tx: DatabaseClient) => Promise<T>,
): Promise<T> {
  return await client.transaction(operation)
}
