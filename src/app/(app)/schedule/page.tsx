import { listSchedule } from '@/actions/schedule'
import { userService } from '@/services/container'
import { ScheduleForm } from './schedule-form'
import { VacationList } from './vacation-list'

export default async function SchedulePage() {
  const [userResult, scheduleResult] = await Promise.all([userService.listAll(), listSchedule()])

  const users = userResult.ok
    ? userResult.value.map((user) => {
        const { cn, displayName, sAMAccountName } = user

        return { cn, displayName, sAMAccountName }
      })
    : []

  const actions = scheduleResult.ok && scheduleResult.data ? scheduleResult.data : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Agende férias: o usuário será desativado na data de ida e reativado na data de volta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ScheduleForm users={users} />
        <VacationList actions={actions} />
      </div>
    </div>
  )
}
