"use server";

import { cookies } from "next/headers";
import { ldapService } from "@backend/services/container";
import { type Session } from "@/lib/types";

function getVal(v: string | string[] | undefined): string | undefined {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
    return String(v);
}

const SESSION_COOKIE = "adweb_session";

export async function login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const user = await ldapService.authenticate(username, password);

        const session: Session = {
            user: {
                sAMAccountName: getVal(user.sAMAccountName) || username,
                cn: getVal(user.cn),
                mail: getVal(user.mail),
                userPrincipalName: getVal(user.userPrincipalName),
            },
            isAdmin: true, // Authenticated users via ldap.authenticate are considered admins in this app context
        };

        const cookieStore = await cookies();
        // Set cookie for 7 days
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            expires,
            sameSite: "lax",
        });

        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: "Credenciais inválidas ou erro de conexão" };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return { ok: true };
}

export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const val = cookieStore.get(SESSION_COOKIE)?.value;
    if (!val) return null;
    try {
        return JSON.parse(val) as Session;
    } catch {
        return null;
    }
}
