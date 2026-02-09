"use server";

import { getFetchAttributes, getEditConfig } from "@/services/ad-user-attributes";
import { type EditAttribute } from "@/types/ldap";

import { verifySession } from "@/utils/manage-jwt";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function getUserAttributesConfig(): Promise<ActionResult<{ fetch: string[]; edit: EditAttribute[] }>> {
    await verifySession();
    try {
        return {
            ok: true,
            data: {
                fetch: getFetchAttributes(),
                edit: getEditConfig()
            }
        };
    } catch (err: any) {
        return { ok: false, error: err.message || "Config failed" };
    }
}
