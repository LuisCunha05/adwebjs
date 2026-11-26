import type { PostgresClient, PostgresTransactionContext } from '@prisma/orm-postgres/runtime'
import type { Contract } from '@/infrastructure/prisma/contract.d'

export type DatabaseClient = PostgresClient<Contract> | PostgresTransactionContext<Contract>
