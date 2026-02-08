"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, Loader2 } from "lucide-react";

export const ACTION_LABELS: Record<string, string> = {
    "user.create": "Criar usuário",
    "user.delete": "Excluir usuário",
    "user.disable": "Desativar usuário",
    "user.enable": "Ativar usuário",
    "user.unlock": "Desbloquear usuário",
    "user.update": "Editar usuário",
    "user.reset_password": "Redefinir senha",
    "user.move": "Mover usuário",
    "vacation.schedule": "Agendar férias",
    "vacation.cancel": "Cancelar agendamento",
    "vacation.execute_disable": "Férias: desativar (automático)",
    "vacation.execute_enable": "Férias: reativar (automático)",
    "group.member_add": "Adicionar membro ao grupo",
    "group.member_remove": "Remover membro do grupo",
    "group.update": "Editar grupo",
};

export function AuditFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [filters, setFilters] = useState({
        action: searchParams.get("action") || "all",
        actor: searchParams.get("actor") || "",
        target: searchParams.get("target") || "",
        since: searchParams.get("since") ? searchParams.get("since")!.slice(0, 10) : "",
        until: searchParams.get("until") ? searchParams.get("until")!.slice(0, 10) : "",
    });

    function applyFilters() {
        startTransition(() => {
            const params = new URLSearchParams();
            if (filters.action && filters.action !== "all") params.set("action", filters.action);
            if (filters.actor) params.set("actor", filters.actor);
            if (filters.target) params.set("target", filters.target);
            if (filters.since) params.set("since", filters.since + "T00:00:00");
            if (filters.until) params.set("until", filters.until + "T23:59:59");

            router.replace(`?${params.toString()}`);
        });
    }

    function clearFilters() {
        setFilters({
            action: "all",
            actor: "",
            target: "",
            since: "",
            until: "",
        });
        startTransition(() => {
            router.replace("?");
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <ScrollText className="size-4" />
                    Filtros
                </CardTitle>
                <CardDescription>Filtre por tipo de ação, quem executou ou alvo. Datas em ISO (ex.: 2025-01-01).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-2">
                        <Label>Ação</Label>
                        <Select
                            value={filters.action}
                            onValueChange={(v) => setFilters((f) => ({ ...f, action: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {Object.entries(ACTION_LABELS).map(([k, label]) => (
                                    <SelectItem key={k} value={k}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Quem (ator)</Label>
                        <Input
                            placeholder="Ex.: seu.cebola ou system"
                            value={filters.actor}
                            onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Alvo</Label>
                        <Input
                            placeholder="Usuário, grupo, etc."
                            value={filters.target}
                            onChange={(e) => setFilters((f) => ({ ...f, target: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>De (data)</Label>
                        <Input
                            type="date"
                            value={filters.since}
                            onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Até (data)</Label>
                        <Input
                            type="date"
                            value={filters.until}
                            onChange={(e) => setFilters((f) => ({ ...f, until: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button onClick={applyFilters} disabled={isPending}>
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                        Atualizar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={clearFilters}
                        disabled={isPending}
                    >
                        Limpar e recarregar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
