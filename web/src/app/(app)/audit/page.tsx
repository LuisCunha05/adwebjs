"use client";

import { useState, useEffect, useCallback } from "react";
import { audit as auditApi, type AuditEntry } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
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

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    action?: string;
    actor?: string;
    target?: string;
    since?: string;
    until?: string;
    limit?: number;
  }>({ limit: 200 });

  const load = useCallback(() => {
    setLoading(true);
    auditApi
      .list(filters)
      .then((r) => setEntries(r.entries ?? []))
      .catch((err) => {
        setEntries([]);
        toast.error(err?.message ?? "Erro ao carregar logs.");
      })
      .finally(() => setLoading(false));
  }, [filters.action, filters.actor, filters.target, filters.since, filters.until, filters.limit]);

  useEffect(() => {
    load();
    // Só recarrega ao montar; use "Atualizar" para aplicar filtros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs de auditoria</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de alterações: desativações, férias, grupos e demais ações no AD.
        </p>
      </div>

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
                value={filters.action ?? "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, action: v === "all" ? undefined : v }))}
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
                value={filters.actor ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value.trim() || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Alvo</Label>
              <Input
                placeholder="Usuário, grupo, etc."
                value={filters.target ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, target: e.target.value.trim() || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>De (data)</Label>
              <Input
                type="date"
                value={filters.since?.slice(0, 10) ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value ? e.target.value + "T00:00:00" : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Até (data)</Label>
              <Input
                type="date"
                value={filters.until?.slice(0, 10) ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, until: e.target.value ? e.target.value + "T23:59:59" : undefined }))}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ limit: 200 });
                load({ limit: 200 });
              }}
            >
              Limpar e recarregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>{entries.length} evento(s). Ordenado do mais recente ao mais antigo.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nenhum registro de auditoria encontrado.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Quem</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead className="max-w-[200px]">Detalhes</TableHead>
                    <TableHead>Sucesso</TableHead>
                    <TableHead className="max-w-[180px]">Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDate(e.at)}
                      </TableCell>
                      <TableCell className="font-medium">{actionLabel(e.action)}</TableCell>
                      <TableCell>
                        <span className={e.actor === "system" ? "text-muted-foreground italic" : ""}>
                          {e.actor}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm truncate max-w-[120px]" title={e.target}>
                        {e.target ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={JSON.stringify(e.details)}>
                        {e.details ? (
                          typeof e.details === "object" ? (
                            Object.entries(e.details)
                              .map(([k, v]) => `${k}=${String(v).slice(0, 30)}`)
                              .join(", ")
                          ) : (
                            String(e.details)
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {e.success ? (
                          <span className="text-green-600 dark:text-green-400">Sim</span>
                        ) : (
                          <span className="text-destructive">Não</span>
                        )}
                      </TableCell>
                      <TableCell className="text-destructive text-xs max-w-[180px] truncate" title={e.error}>
                        {e.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
