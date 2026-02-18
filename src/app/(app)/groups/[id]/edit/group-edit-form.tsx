"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateGroup, addMemberToGroup, removeMemberFromGroup } from "@/actions/groups";
import { listUsers } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActiveDirectoryUser } from "@/schemas/attributesAd";
import { PaginatedResult } from '@/types/ldap';

interface Group {
    dn: string;
    cn: string;
    name?: string;
    member?: string | string[];
}

interface GroupEditFormProps {
    group: Group;
    initialResolvedMembers: { dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[];
}

export function GroupEditForm({ group, initialResolvedMembers }: GroupEditFormProps) {
    const router = useRouter();

    const [form, setForm] = useState({
        name: group.name ?? group.cn ?? "",
        member: (Array.isArray(group.member) ? group.member : group.member ? [String(group.member)] : []).join("\n")
    });

    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [addSearch, setAddSearch] = useState("");
    const [userSearchResults, setUserSearchResults] = useState<ActiveDirectoryUser[]>([]);
    const [searching, setSearching] = useState(false);

    // We rely on Props for member list, but since we modify it via actions, we might want to refresh.
    // Server Actions + router.refresh() handles this elegantly in Next.js.
    // However, display names for new members might not be resolved immediately if we don't re-fetch resolved members.
    // The server page fetches resolved members, so router.refresh() should update the prop!

    const memberList = initialResolvedMembers;
    // If fallback logic needed:
    const rawMemberList = group.member ? (Array.isArray(group.member) ? group.member : [String(group.member)]) : [];
    const displayMembers = memberList.length > 0 ? memberList : rawMemberList.map((dn: string) => ({ dn }));
    const showingFallbackDns = memberList.length === 0 && rawMemberList.length > 0;

    const existingDns = new Set(rawMemberList.map((d: string) => d.toLowerCase()));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const memberList = form.member.split("\n").map((m: string) => m.trim()).filter(Boolean);
            const res = await updateGroup(group.dn, { name: form.name || undefined, member: memberList });
            if (!res.ok) throw new Error(res.error);

            toast.success("Grupo atualizado.");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    }

    async function handleAddMember(dn: string) {
        if (actionLoading) return;
        setActionLoading(dn);
        try {
            const res = await addMemberToGroup(group.dn, dn);
            if (!res.ok) throw new Error(res.error);

            toast.success("Membro adicionado.");
            setAddSearch("");
            setUserSearchResults([]);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Falha ao adicionar.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRemoveMember(dn: string) {
        if (actionLoading) return;
        setActionLoading(dn);
        try {
            const res = await removeMemberFromGroup(group.dn, dn);
            if (!res.ok) throw new Error(res.error);

            toast.success("Membro removido.");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Falha ao remover.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleSearchUsers() {
        const q = addSearch.trim();
        if (!q) {
            setUserSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await listUsers(q, "sAMAccountName");
            if (res.data) {
                if ('data' in res.data && Array.isArray(res.data.data)) {
                    setUserSearchResults(res.data.data);
                } else if (Array.isArray(res.data)) {
                    setUserSearchResults(res.data);
                } else {
                    setUserSearchResults([]);
                }
            } else {
                setUserSearchResults([]);
            }
        } catch {
            setUserSearchResults([]);
        } finally {
            setSearching(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/groups">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Editar grupo: {group.cn}</h1>
                    <p className="text-muted-foreground text-sm">Alterar nome e gerenciar membros no Active Directory.</p>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Atributos</CardTitle>
                    <CardDescription>Nome de exibição e lista de DNs (um por linha) para edição em massa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cn">Nome comum (cn)</Label>
                            <Input id="cn" value={group.cn ?? ""} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="member">Membros (DNs) — edição em massa</Label>
                            <Textarea
                                id="member"
                                rows={4}
                                placeholder="CN=User,OU=Users,DC=example,DC=com"
                                value={form.member}
                                onChange={(e) => setForm((f) => ({ ...f, member: e.target.value }))}
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/groups">Cancelar</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="size-4" />
                        Adicionar membro
                    </CardTitle>
                    <CardDescription>Busque um usuário e adicione-o ao grupo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Buscar por nome de usuário..."
                            value={addSearch}
                            onChange={(e) => setAddSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchUsers())}
                        />
                        <Button type="button" variant="secondary" onClick={handleSearchUsers} disabled={searching}>
                            {searching ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
                        </Button>
                    </div>
                    {userSearchResults.length > 0 && (
                        <ul className="rounded-lg border divide-y">
                            {userSearchResults.map((u) => {
                                const dn = u.dn ?? "";
                                const alreadyMember = dn && existingDns.has(dn.toLowerCase());
                                const loadingAdd = actionLoading === dn;
                                return (
                                    <li key={dn || u.sAMAccountName} className="flex items-center justify-between px-3 py-2">
                                        <div className="min-w-0">
                                            <span className="font-medium">{u.sAMAccountName}</span>
                                            <span className="text-muted-foreground text-sm ml-2">{(u.displayName || u.cn || u.mail || "").toString()}</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={alreadyMember || !!actionLoading || !dn}
                                            onClick={() => handleAddMember(dn)}
                                        >
                                            {loadingAdd ? <Loader2 className="size-4 animate-spin" /> : alreadyMember ? "Já é membro" : "Adicionar"}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Membros ({displayMembers.length})</CardTitle>
                    <CardDescription>
                        {showingFallbackDns
                            ? "Exibindo DNs (resolução indisponível). Remover desvincula do grupo."
                            : "Lista com nomes resolvidos. Remover não altera o usuário, apenas a associação ao grupo."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {displayMembers.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">Nenhum membro ou não foi possível carregar.</p>
                    ) : (
                        <ul className="space-y-2">
                            {displayMembers.map((m: any) => {
                                const loadingRm = actionLoading === m.dn;
                                const display = m.displayName || m.cn || m.sAMAccountName || m.dn;
                                return (
                                    <li key={m.dn} className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="min-w-0 truncate">
                                            <span className="font-medium">{display}</span>
                                            {(m.sAMAccountName || m.dn) && (
                                                <p className="text-muted-foreground text-xs font-mono truncate" title={m.dn}>
                                                    {m.sAMAccountName || m.dn}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 text-destructive hover:text-destructive"
                                            onClick={() => handleRemoveMember(m.dn)}
                                            disabled={!!actionLoading}
                                        >
                                            {loadingRm ? <Loader2 className="size-4 animate-spin" /> : "Remover"}
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
