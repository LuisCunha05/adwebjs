"use server";

import { ldapService } from "@backend/services/container";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function getStats(): Promise<ActionResult<{ usersCount: number; disabledCount: number; groupsCount: number }>> {
    try {
        const stats = await ldapService.getStats();
        return { ok: true, data: stats };
    } catch (err: any) {
        return { ok: false, error: err.message || "Stats failed" };
    }
}
