import { listUsersCached } from '@/queries/ldap'
import { listSchedulePaginated } from '@/queries/schedule'
import { ScheduleForm } from './schedule-form'
import { VacationList } from './vacation-list'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams

  const person =
    typeof resolvedSearchParams.person === 'string' ? resolvedSearchParams.person : undefined
  const startDate =
    typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : undefined
  const endDate =
    typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : undefined
  const page =
    typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) || 1 : 1
  const limit = 10

  const [userResult, scheduleResult] = await Promise.all([
    listUsersCached(),
    listSchedulePaginated({
      page,
      limit,
      person,
      startDate,
      endDate,
    }),
  ])

  const users = userResult.ok
    ? userResult.value.map((user) => {
        const { cn, displayName, sAMAccountName } = user

        return { cn, displayName, sAMAccountName }
      })
    : []

  const paginatedData = scheduleResult.ok
    ? scheduleResult.value
    : { tasks: [], total: 0, page: 1, limit: 10 }

  const userError = !userResult.ok ? userResult.error.message : null
  const scheduleError = !scheduleResult.ok ? scheduleResult.error.message : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Agende férias: o usuário será desativado na data de ida e reativado na data de volta.
        </p>
      </div>

      {(userError || scheduleError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 space-y-1">
          {userError && <p>Erro ao carregar usuários: {userError}</p>}
          {scheduleError && <p>Erro ao carregar agendamentos: {scheduleError}</p>}
        </div>
      )}

      <div className="grid gap-6">
        <ScheduleForm users={users} />
        <VacationList
          actions={paginatedData.tasks}
          totalCount={paginatedData.total}
          currentPage={paginatedData.page}
          pageSize={paginatedData.limit}
        />
      </div>
    </div>
  )
}
