"use server";

import { ldapService } from "@backend/services/container";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function listOUs(): Promise<ActionResult<any[]>> {
    try {
        const ous = await ldapService.listOUs();
        return { ok: true, data: JSON.parse(JSON.stringify(ous || [])) };
    } catch (err: any) {
        return { ok: true, data: [] }; // Return empty list on error as per original API
    }
}
