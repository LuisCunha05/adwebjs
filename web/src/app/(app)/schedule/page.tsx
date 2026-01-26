"use client";

import { useState, useEffect, useCallback } from "react";
import { schedule as scheduleApi, users as usersApi, type ScheduledAction } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Loader2, Trash2, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

type VacationGroup = {
  vacationId: string;
  userId: string;
  startDate: string;
  endDate: string;
  actionIds: string[];
};

function groupByVacation(actions: ScheduledAction[]): VacationGroup[] {
  const byVacation = new Map<string, VacationGroup>();
  for (const a of actions) {
    const vid = a.meta?.vacationId ?? a.id;
    if (!byVacation.has(vid)) {
      byVacation.set(vid, {
        vacationId: vid,
        userId: a.userId,
        startDate: a.meta?.startDate ?? a.runAt,
        endDate: a.meta?.endDate ?? "",
        actionIds: [],
      });
    }
    byVacation.get(vid)!.actionIds.push(a.id);
    if (a.meta?.startDate) byVacation.get(vid)!.startDate = a.meta.startDate;
    if (a.meta?.endDate) byVacation.get(vid)!.endDate = a.meta.endDate;
  }
  return Array.from(byVacation.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export default function SchedulePage() {
  const [actions, setActions] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

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
    if (cancelId) return;
    setCancelId(vacation.vacationId);
    try {
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
        <CardHeader>
          <CardTitle>Agendamentos de férias</CardTitle>
          <CardDescription>Próximas desativações/reativações automáticas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : vacations.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nenhum agendamento de férias.</p>
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
                      <p className="font-medium">{v.userId}</p>
                      <p className="text-muted-foreground text-sm">
                        Ida: {new Date(v.startDate).toLocaleDateString("pt-BR")} → Volta:{" "}
                        {new Date(v.endDate).toLocaleDateString("pt-BR")}
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
