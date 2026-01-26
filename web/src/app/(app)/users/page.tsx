"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { users as usersApi, ApiError } from "@/lib/api";
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
import { Search, Pencil } from "lucide-react";
import { toast } from "sonner";

const searchByOptions = [
  { value: "sAMAccountName", label: "Usuário" },
  { value: "mail", label: "E-mail" },
  { value: "employeeNumber", label: "Matrícula" },
  { value: "name", label: "Nome" },
  { value: "sn", label: "Sobrenome" },
] as const;

function uacLabel(value: string | number | undefined): string {
  if (value == null) return "—";
  const n = Number(value);
  if (n === 512) return "Ativo";
  if (n === 514) return "Desativado";
  if (n === 66048) return "Normal, senha não expira";
  return String(value);
}

function uacVariant(
  value: string | number | undefined
): "default" | "secondary" | "destructive" | "outline" {
  const n = Number(value);
  if (n === 514) return "destructive";
  return "secondary";
}

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState<string>("sAMAccountName");
  const [submittedQ, setSubmittedQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQ(q.trim());
    if (!q.trim()) {
      setList([]);
      return;
    }
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await usersApi.list(q.trim(), searchBy);
        setList(res.users ?? []);
        if ((res.users ?? []).length === 0) {
          toast.info("Nenhum usuário encontrado.");
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Erro ao buscar.");
        setList([]);
      } finally {
        setLoading(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Pesquise e edite contas de usuário do Active Directory.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesquisar</CardTitle>
          <CardDescription>
            Informe o termo e o tipo de busca para listar usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label htmlFor="q" className="text-sm font-medium leading-none">
                Termo
              </label>
              <Input
                id="q"
                placeholder="Ex.: joao ou joao@empresa.com"
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
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
          <CardDescription>
            {submittedQ
              ? list.length === 0 && !loading && !isPending
                ? "Nenhum resultado."
                : `${list.length} usuário(s) encontrado(s).`
              : "Use a pesquisa acima para listar usuários."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || isPending ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !submittedQ ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Digite um termo e clique em Buscar.
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Nenhum usuário encontrado para &ldquo;{submittedQ}&rdquo;.
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
                    <TableCell className="font-medium">
                      {u.sAMAccountName ?? "—"}
                    </TableCell>
                    <TableCell>{u.name ?? u.cn ?? "—"}</TableCell>
                    <TableCell>{u.mail ?? u.userPrincipalName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.pwdLastSet ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={uacVariant(u.userAccountControl)}>
                        {uacLabel(u.userAccountControl)}
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
