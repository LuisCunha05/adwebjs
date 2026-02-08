"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelTask } from "@/app/actions/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { type ScheduledTask, ScheduleStatus } from "@/lib/types";

type VacationGroup = {
    vacationId: number | string;
    startDate: string;
    endDate: string;
    actionIds: number[];
    status: ScheduleStatus;
};

function groupByVacation(actions: ScheduledTask[]): VacationGroup[] {
    const byVacation = new Map<number, VacationGroup>();

    for (const a of actions) {
        if (!a.relatedId) continue;

        if (!byVacation.has(a.relatedId)) {
            byVacation.set(a.relatedId, {
                vacationId: a.relatedId,
                startDate: a.runAt,
                endDate: "",
                actionIds: [],
                status: a.status as ScheduleStatus // Assuming types align or casting
            });
        }

        const group = byVacation.get(a.relatedId)!;
        group.actionIds.push(a.id);
        if (new Date(a.runAt) < new Date(group.startDate)) group.startDate = a.runAt;
        if (!group.endDate || new Date(a.runAt) > new Date(group.endDate)) group.endDate = a.runAt;
    }

    return Array.from(byVacation.values()).sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
}

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

interface VacationListProps {
    actions: ScheduledTask[];
}

export function VacationList({ actions }: VacationListProps) {
    const router = useRouter();
    const [cancelId, setCancelId] = useState<number | null>(null);

    const vacations = groupByVacation(actions);

    async function handleCancelVacation(vacation: VacationGroup) {
        const vacationId = Number(vacation.vacationId);
        if (cancelId || isNaN(vacationId)) return;

        setCancelId(vacationId);
        try {
            // Cancel all tasks associated with this vacation
            for (const id of vacation.actionIds) {
                await cancelTask(id);
            }
            toast.success("Agendamento de férias cancelado.");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Erro ao cancelar.");
        } finally {
            setCancelId(null);
        }
    }

    return (
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
                {vacations.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">Nenhum agendamento encontrado.</p>
                ) : (
                    <ul className="space-y-3">
                        {vacations.map((v) => {
                            const cancelling = cancelId === Number(v.vacationId);
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
                                        disabled={cancelling || !!cancelId}
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
    );
}
