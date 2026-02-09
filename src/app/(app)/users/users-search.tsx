"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { listGroups } from "@/actions/groups";

const searchByOptions = [
    { value: "sAMAccountName", label: "Usuário" },
    { value: "mail", label: "E-mail" },
    { value: "employeeNumber", label: "Matrícula" },
    { value: "name", label: "Nome" },
    { value: "sn", label: "Sobrenome" },
] as const;

interface UsersSearchProps {
    ous: { dn: string; ou?: string; name?: string }[];
}

export function UsersSearch({ ous }: UsersSearchProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [q, setQ] = useState(searchParams.get("q") || "");
    const [searchBy, setSearchBy] = useState(searchParams.get("searchBy") || "sAMAccountName");
    const [ou, setOu] = useState(searchParams.get("ou") || "");
    const [memberOf, setMemberOf] = useState(searchParams.get("memberOf") || "");
    const [disabledOnly, setDisabledOnly] = useState(searchParams.get("disabledOnly") === "true");

    const [groups, setGroups] = useState<{ dn?: string; cn?: string; name?: string }[]>([]);
    const [groupsQuery, setGroupsQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    // Fetch groups for autocomplete
    useEffect(() => {
        if (!groupsQuery.trim()) {
            setGroups([]);
            return;
        }
        const t = setTimeout(() => {
            listGroups(groupsQuery.trim()).then((r) => setGroups(r.data ?? [])).catch(() => setGroups([]));
        }, 300);
        return () => clearTimeout(t);
    }, [groupsQuery]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        startTransition(() => {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            if (searchBy && searchBy !== "sAMAccountName") params.set("searchBy", searchBy);
            if (ou) params.set("ou", ou);
            if (memberOf) params.set("memberOf", memberOf);
            if (disabledOnly) params.set("disabledOnly", "true");

            router.replace(`?${params.toString()}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Pesquisar</CardTitle>
                <CardDescription>
                    Termo de busca e filtros opcionais: OU, grupo ou apenas desativados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <label htmlFor="q" className="text-sm font-medium leading-none">
                                Termo
                            </label>
                            <Input
                                id="q"
                                placeholder="Ex.: joao ou * para todos (com filtros)"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                        <div className="w-[180px] space-y-2">
                            <label className="text-sm font-medium leading-none">Buscar por</label>
                            <Select value={searchBy} onValueChange={setSearchBy}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {searchByOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={isPending}>
                            <Search className="size-4 mr-2" />
                            {isPending ? "Buscando…" : "Buscar"}
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
                        <div className="w-[220px] space-y-2">
                            <label className="text-sm font-medium leading-none">OU (opcional)</label>
                            <Select value={ou || "__all__"} onValueChange={(v) => setOu(v === "__all__" ? "" : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Todas</SelectItem>
                                    {ous.map((o) => (
                                        <SelectItem key={o.dn} value={o.dn}>
                                            {o.ou ?? o.name ?? o.dn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[260px] space-y-2">
                            <label className="text-sm font-medium leading-none">Grupo (opcional)</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Buscar grupo..."
                                    value={groupsQuery}
                                    onChange={(e) => setGroupsQuery(e.target.value)}
                                    className="h-9 flex-1"
                                />
                                <Select value={memberOf || "__none__"} onValueChange={(v) => setMemberOf(v === "__none__" ? "" : v)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Nenhum</SelectItem>
                                        {groups
                                            .slice(0, 80)
                                            .filter((g) => (g.dn ?? g.cn) != null && (g.dn ?? g.cn) !== "")
                                            .map((g) => {
                                                const val = String(g.dn ?? g.cn);
                                                return (
                                                    <SelectItem key={val} value={val}>
                                                        {(g.cn ?? g.name ?? g.dn ?? "").slice(0, 30)}
                                                    </SelectItem>
                                                );
                                            })}
                                        {groupsQuery.trim() && groups.length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum grupo</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={disabledOnly}
                                onChange={(e) => setDisabledOnly(e.target.checked)}
                                className="rounded border-input"
                            />
                            <span className="text-sm">Apenas desativados</span>
                        </label>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
