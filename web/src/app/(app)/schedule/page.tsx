"use client";

import { useState, useEffect, useCallback } from "react";
import { schedule as scheduleApi, users as usersApi, type ScheduledTask, ScheduleStatus } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Loader2, Trash2, UserSearch, Download } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

type VacationGroup = {
  vacationId: number | string; // Assuming relatedId represents vacationId, using number mostly
  startDate: string;
  endDate: string; // Will try to infer from end task or simply display start task time
  actionIds: number[];
  status: ScheduleStatus;
};

function downloadVacationsCsv(vacations: VacationGroup[]) {
  const lines = [
    "vacation_id,data_inicial,status",
    ...vacations.map((v) =>
      [v.vacationId, v.startDate, v.status].join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ferias-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function groupByVacation(actions: ScheduledTask[]): VacationGroup[] {
  // Group by relatedId.
  // Assumption: vacation tasks have relatedTable="vacation" (implied, or simply group by relatedId)
  const byVacation = new Map<number, VacationGroup>();

  for (const a of actions) {
    // Only interest in tasks that seem to be vacation related
    // Since we don't have relatedTable info guaranteed or might need logic, we group by relatedId
    // If relatedId is 0 or null, we might treat individual tasks.
    if (!a.relatedId) continue;

    if (!byVacation.has(a.relatedId)) {
      byVacation.set(a.relatedId, {
        vacationId: a.relatedId,
        startDate: a.runAt, // First task usually start
        endDate: "", // We might not know end date if tasks are split
        actionIds: [],
        status: a.status
      });
    }

    const group = byVacation.get(a.relatedId)!;
    group.actionIds.push(a.id);
    // Rough logic: if this task is later than current known start, maybe it's the end date?
    // Actually typically VACATION_START is runAt start, VACATION_END is runAt end.
    // We can just track min/max runAt?
    if (new Date(a.runAt) < new Date(group.startDate)) group.startDate = a.runAt;
    if (!group.endDate || new Date(a.runAt) > new Date(group.endDate)) group.endDate = a.runAt;

    // Status aggregation logic could be complex, simplifying: use status of first/any
  }

  return Array.from(byVacation.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export default function SchedulePage() {
  const [actions, setActions] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(() => {
    scheduleApi
      .list()
      .then((r) => setActions(r.actions ?? []))
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearchUser() {
    const q = userSearch.trim();
    if (!q) {
      setUserResults([]);
      return;
    }
    usersApi
      .list(q, "sAMAccountName")
      .then((r) => setUserResults(r.users ?? []))
      .catch(() => setUserResults([]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !startDate || !endDate || submitting) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      toast.error("Data de volta deve ser após a data de ida.");
      return;
    }
    setSubmitting(true);
    try {
      await scheduleApi.createVacation(selectedUser.id, startDate, endDate);
      toast.success("Férias agendadas: conta será desativada na ida e reativada na volta.");
      setSelectedUser(null);
      setStartDate("");
      setEndDate("");
      setUserSearch("");
      setUserResults([]);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao agendar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelVacation(vacation: VacationGroup) {
    // Assuming vacationId is number
    const vacationId = Number(vacation.vacationId);
    if (cancelId || isNaN(vacationId)) return;

    setCancelId(vacationId);
    try {
      // Backend doesn't have a "cancel whole vacation" endpoint exposed here directly in list?
      // Actually api.ts has cancel(id: number).
      // Ideally we delete by relatedId but the API for that isn't in api.ts separately?
      // Wait, schedule.cancel(id) cancels a task.
      // We have multiple tasks per vacation (start/end).
      // We should cancel all of them.

      for (const id of vacation.actionIds) {
        await scheduleApi.cancel(id);
      }
      toast.success("Agendamento de férias cancelado.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    } finally {
      setCancelId(null);
    }
  }

  const vacations = groupByVacation(actions);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">
          Agende férias: o usuário será desativado na data de ida e reativado na data de volta.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            Agendar férias
          </CardTitle>
          <CardDescription>
            Selecione o usuário e as datas. Na data de ida a conta será desativada; na data de volta, reativada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nome de usuário..."
                  value={selectedUser ? selectedUser.label : userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    if (selectedUser) setSelectedUser(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchUser())}
                />
                <Button type="button" variant="secondary" onClick={handleSearchUser}>
                  <UserSearch className="size-4" />
                </Button>
              </div>
              {userResults.length > 0 && !selectedUser && (
                <ul className="rounded-lg border divide-y max-h-40 overflow-auto">
                  {userResults.map((u) => (
                    <li key={u.sAMAccountName}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSelectedUser({
                            id: u.sAMAccountName,
                            label: [u.sAMAccountName, u.cn || u.displayName].filter(Boolean).join(" – "),
                          });
                          setUserResults([]);
                          setUserSearch("");
                        }}
                      >
                        {u.sAMAccountName}
                        {u.cn || u.displayName ? ` — ${u.cn || u.displayName}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de ida (desativa)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de volta (reativa)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={!selectedUser || !startDate || !endDate || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Agendar férias"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Agendamentos de férias ({vacations.length})</CardTitle>
            <CardDescription>Próximas desativações/reativações automáticas.</CardDescription>
          </div>
          {vacations.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => downloadVacationsCsv(vacations)}>
              <Download className="size-4 mr-2" />
              Exportar (CSV)
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : vacations.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nenhum agendamento encontrado.</p>
          ) : (
            <ul className="space-y-3">
              {vacations.map((v) => {
                const cancelling = cancelId === v.vacationId;
                return (
                  <li
                    key={v.vacationId}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        Agendamento #{v.vacationId}
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({v.status})</span>
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {new Date(v.startDate).toLocaleDateString("pt-BR")}
                        {v.endDate && v.endDate !== v.startDate ? ` -> ${new Date(v.endDate).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelVacation(v)}
                      disabled={cancelling}
                    >
                      {cancelling ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Cancelar
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
