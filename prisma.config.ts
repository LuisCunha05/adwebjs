import 'dotenv/config'
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config'
import { definePrismaConfig } from 'prisma/config'

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/infrastructure/prisma/contract.prisma',
    migrations: {
      dir: './src/infrastructure/prisma/migrations',
    },
    db: {
      connection:
        process.env.DB_HOST && process.env.DB_USER
          ? `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?schema=public`
          : process.env.DATABASE_URL,
    },
  }),
})
