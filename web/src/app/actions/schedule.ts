"use server";

import { scheduleService, vacationScheduleService, auditService } from "@backend/services/container";
import { type ScheduledTask } from "@/lib/types";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function listSchedule(): Promise<ActionResult<ScheduledTask[]>> {
    try {
        const actions = scheduleService.list();
        return { ok: true, data: JSON.parse(JSON.stringify(actions)) };
    } catch (err: any) {
        return { ok: false, error: err.message || "Schedule list failed" };
    }
}

export async function createVacation(userId: string, startDate: string, endDate: string): Promise<ActionResult<{ vacationId: number }>> {
    if (!userId || !startDate || !endDate) return { ok: false, error: "Missing required fields" };

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return { ok: false, error: "Invalid dates" };
    }

    try {
        const vacationId = vacationScheduleService.schedule(String(userId), startDate, endDate);
        auditService.log({ action: "vacation.schedule", actor: "server-action", target: String(userId), details: { startDate, endDate, vacationId }, success: true });
        return { ok: true, data: { vacationId } };
    } catch (err: any) {
        auditService.log({ action: "vacation.schedule", actor: "server-action", target: String(userId), details: { startDate, endDate }, success: false, error: err.message });
        return { ok: false, error: err.message || "Schedule vacation failed" };
    }
}

export async function cancelTask(id: number): Promise<ActionResult> {
    if (isNaN(id)) return { ok: false, error: "Invalid ID" };
    try {
        const removed = scheduleService.remove(id);
        if (!removed) return { ok: false, error: "Scheduled action not found" };
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err.message || "Cancel failed" };
    }
}
