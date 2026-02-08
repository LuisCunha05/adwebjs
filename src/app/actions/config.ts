"use server";

import { getFetchAttributes, getEditConfig } from "@/services/ad-user-attributes";
import { type EditAttribute } from "@/types/ldap";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function getUserAttributesConfig(): Promise<ActionResult<{ fetch: string[]; edit: EditAttribute[] }>> {
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
