"use server";

import { ldapService, auditService } from "@backend/services/container";

interface ActionResult<T = void> {
    ok: boolean;
    data?: T;
    error?: string;
}

export async function listGroups(q: string): Promise<ActionResult<any[]>> {
    if (!q) return { ok: true, data: [] };
    try {
        const groups = await ldapService.searchGroups(q);
        return { ok: true, data: JSON.parse(JSON.stringify(groups)) };
    } catch (err: any) {
        return { ok: false, error: err.message || "Search failed" };
    }
}

export async function getGroup(id: string): Promise<ActionResult<any>> {
    try {
        const group = await ldapService.getGroup(id);
        return { ok: true, data: JSON.parse(JSON.stringify(group)) };
    } catch (err: any) {
        return { ok: false, error: err.message || "Group not found" };
    }
}

export async function updateGroup(id: string, changes: { name?: string; description?: string; member?: string[] }): Promise<ActionResult<any>> {
    try {
        const updated = await ldapService.updateGroup(id, changes);
        auditService.log({ action: "group.update", actor: "server-action", target: id, details: { fields: Object.keys(changes) }, success: true });
        return { ok: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (err: any) {
        auditService.log({ action: "group.update", actor: "server-action", target: id, success: false, error: err.message });
        return { ok: false, error: err.message || "Update failed" };
    }
}

export async function addMemberToGroup(id: string, dn: string): Promise<ActionResult> {
    if (!dn) return { ok: false, error: "dn required" };
    try {
        await ldapService.addMemberToGroup(id, dn.trim());
        auditService.log({ action: "group.member_add", actor: "server-action", target: id, details: { memberDn: dn }, success: true });
        return { ok: true };
    } catch (err: any) {
        auditService.log({ action: "group.member_add", actor: "server-action", target: id, details: { memberDn: dn }, success: false, error: err.message });
        return { ok: false, error: err.message || "Add member failed" };
    }
}

export async function removeMemberFromGroup(id: string, dn: string): Promise<ActionResult> {
    if (!dn) return { ok: false, error: "dn required" };
    try {
        await ldapService.removeMemberFromGroup(id, dn.trim());
        auditService.log({ action: "group.member_remove", actor: "server-action", target: id, details: { memberDn: dn }, success: true });
        return { ok: true };
    } catch (err: any) {
        auditService.log({ action: "group.member_remove", actor: "server-action", target: id, details: { memberDn: dn }, success: false, error: err.message });
        return { ok: false, error: err.message || "Remove member failed" };
    }
}

export async function getGroupMembersResolved(id: string): Promise<ActionResult<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]>> {
    try {
        const group = await ldapService.getGroup(id);
        const raw = group.member;
        const members = Array.isArray(raw) ? raw : (raw != null ? [String(raw)] : []);
        if (members.length === 0) return { ok: true, data: [] };

        try {
            const resolved = await ldapService.resolveMemberDns(members);
            return { ok: true, data: JSON.parse(JSON.stringify(resolved)) };
        } catch {
            return { ok: true, data: members.map((dn: string) => ({ dn })) };
        }
    } catch (err: any) {
        return { ok: false, error: err.message || "Group not found" };
    }
}
