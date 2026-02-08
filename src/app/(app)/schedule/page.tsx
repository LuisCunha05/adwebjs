import { listSchedule } from "@/app/actions/schedule";
import { ScheduleForm } from "./schedule-form";
import { VacationList } from "./vacation-list";

export default async function SchedulePage() {
  const res = await listSchedule();
  const actions = res.ok && res.data ? res.data : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Agende férias: o usuário será desativado na data de ida e reativado na data de volta.
        </p>
      </div>

      <ScheduleForm />
      <VacationList actions={actions} />
    </div>
  );
}
