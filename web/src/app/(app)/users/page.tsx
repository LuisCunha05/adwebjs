"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { users as usersApi, ous as ousApi, groups as groupsApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";

const searchByOptions = [
  { value: "sAMAccountName", label: "Usuário" },
  { value: "mail", label: "E-mail" },
  { value: "employeeNumber", label: "Matrícula" },
  { value: "name", label: "Nome" },
  { value: "sn", label: "Sobrenome" },
] as const;

const UAC_DISABLED = 2;
const UAC_DONT_EXPIRE_PASSWD = 65536;

function uacToLabel(value: string | number | undefined): string {
  if (value == null) return "—";
  const n = Number(value);
  const disabled = (n & UAC_DISABLED) !== 0;
  const pwdNeverExpires = (n & UAC_DONT_EXPIRE_PASSWD) !== 0;
  const status = disabled ? "Desativada" : "Ativa";
  if (pwdNeverExpires) return `${status}, senha não expira`;
  return status;
}

function uacVariant(
  value: string | number | undefined
): "default" | "secondary" | "destructive" | "outline" {
  const n = Number(value) || 0;
  if ((n & UAC_DISABLED) !== 0) return "destructive";
  return "secondary";
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadUsersCsv(rows: any[]) {
  const headers = ["usuário", "nome_completo", "email", "status"];
  const lines = [
    headers.join(","),
    ...rows.map((u) =>
      [
        csvEscape(String(u.sAMAccountName ?? "")),
        csvEscape(String(u.name ?? u.cn ?? "")),
        csvEscape(String(u.mail ?? u.userPrincipalName ?? "")),
        csvEscape(uacToLabel(u.userAccountControl)),
      ].join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState<string>("sAMAccountName");
  const [ou, setOu] = useState("");
  const [memberOf, setMemberOf] = useState("");
  const [disabledOnly, setDisabledOnly] = useState(false);
  const [submittedQ, setSubmittedQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ous, setOus] = useState<{ dn: string; ou?: string; name?: string }[]>([]);
  const [groups, setGroups] = useState<{ dn?: string; cn?: string; name?: string }[]>([]);
  const [groupsQuery, setGroupsQuery] = useState("");

  useEffect(() => {
    ousApi.list().then((r) => setOus(r.ous ?? [])).catch(() => setOus([]));
  }, []);

  useEffect(() => {
    if (!groupsQuery.trim()) {
      setGroups([]);
      return;
    }
    const t = setTimeout(() => {
      groupsApi.list(groupsQuery.trim()).then((r) => setGroups(r.groups ?? [])).catch(() => setGroups([]));
    }, 300);
    return () => clearTimeout(t);
  }, [groupsQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const hasFilters = !!(ou || memberOf || disabledOnly);
    if (!q.trim() && !hasFilters) {
      setList([]);
      toast.info("Informe um termo de busca ou use os filtros (OU, grupo ou apenas desativados).");
      return;
    }
    setSubmittedQ(q.trim() || "(filtros)");
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await usersApi.list(q.trim(), searchBy, {
          ou: ou || undefined,
          memberOf: memberOf || undefined,
          disabledOnly: disabledOnly || undefined,
        });
        setList(res.users ?? []);
        if ((res.users ?? []).length === 0) toast.info("Nenhum usuário encontrado.");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Erro ao buscar.");
        setList([]);
      } finally {
        setLoading(false);
      }
    });
  }

  const hasSearched = submittedQ.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Pesquise, crie e edite contas de usuário do Active Directory.
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <UserPlus className="size-4 mr-2" />
            Novo usuário
          </Link>
        </Button>
      </div>
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
              <Button type="submit" disabled={loading || isPending}>
                <Search className="size-4 mr-2" />
                {loading || isPending ? "Buscando…" : "Buscar"}
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Resultados</CardTitle>
            <CardDescription>
              {!hasSearched
                ? "Use a pesquisa acima para listar usuários."
                : list.length === 0 && !loading && !isPending
                  ? "Nenhum resultado."
                  : `${list.length} usuário(s) encontrado(s).`}
            </CardDescription>
          </div>
          {list.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => downloadUsersCsv(list)}>
              <Download className="size-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading || isPending ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !hasSearched ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Digite um termo (ou use filtros) e clique em Buscar.
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Nome completo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Última senha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
                  <TableRow key={u.sAMAccountName ?? u.dn}>
                    <TableCell className="font-medium">{u.sAMAccountName ?? "—"}</TableCell>
                    <TableCell>{u.name ?? u.cn ?? "—"}</TableCell>
                    <TableCell>{u.mail ?? u.userPrincipalName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{u.pwdLastSet ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={uacVariant(u.userAccountControl)}>
                        {uacToLabel(u.userAccountControl)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/users/${encodeURIComponent(u.sAMAccountName)}/edit`}>
                          <Pencil className="size-4 mr-1" />
                          Editar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
