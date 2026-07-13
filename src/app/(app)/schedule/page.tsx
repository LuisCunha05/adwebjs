import { listUsersCached } from '@/queries/ldap'
import { listScheduleCached, listVacationsCached } from '@/queries/schedule'
import { ScheduleForm } from './schedule-form'
import { VacationList } from './vacation-list'

export default async function SchedulePage() {
  const [userResult, scheduleResult, vacationResult] = await Promise.all([
    listUsersCached(),
    listScheduleCached(),
    listVacationsCached(),
  ])

  const users = userResult.ok
    ? userResult.value.map((user) => {
        const { cn, displayName, sAMAccountName } = user

        return { cn, displayName, sAMAccountName }
      })
    : []

  const actions = scheduleResult.ok ? scheduleResult.value : []
  const vacations = vacationResult.ok ? vacationResult.value : []

  const userError = !userResult.ok ? userResult.error.message : null
  const scheduleError = !scheduleResult.ok ? scheduleResult.error.message : null
  const vacationError = !vacationResult.ok ? vacationResult.error.message : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Agende férias: o usuário será desativado na data de ida e reativado na data de volta.
        </p>
      </div>

      {(userError || scheduleError || vacationError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 space-y-1">
          {userError && <p>Erro ao carregar usuários: {userError}</p>}
          {scheduleError && <p>Erro ao carregar agendamentos: {scheduleError}</p>}
          {vacationError && <p>Erro ao carregar férias: {vacationError}</p>}
        </div>
      )}

      <div className="grid gap-6">
        <ScheduleForm users={users} />
        <VacationList actions={actions} vacations={vacations} users={users} />
      </div>
    </div>
  )
}
