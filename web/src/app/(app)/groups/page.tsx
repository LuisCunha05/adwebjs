"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { groups as groupsApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function GroupsPage() {
  const [q, setQ] = useState("");
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
        const res = await groupsApi.list(q.trim());
        setList(res.groups ?? []);
        if ((res.groups ?? []).length === 0) {
          toast.info("Nenhum grupo encontrado.");
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
        <h1 className="text-2xl font-semibold tracking-tight">Grupos</h1>
        <p className="text-muted-foreground mt-1">
          Pesquise e edite grupos do Active Directory.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesquisar</CardTitle>
          <CardDescription>
            Informe o nome ou parte do nome do grupo.
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
                placeholder="Ex.: TI ou ADWEB"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="max-w-md"
              />
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
                : `${list.length} grupo(s) encontrado(s).`
              : "Use a pesquisa acima para listar grupos."}
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
              Nenhum grupo encontrado para &ldquo;{submittedQ}&rdquo;.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome (CN)</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((g) => (
                  <TableRow key={g.cn ?? g.dn}>
                    <TableCell className="font-medium">{g.cn ?? "—"}</TableCell>
                    <TableCell>{g.name ?? g.cn ?? "—"}</TableCell>
                    <TableCell>
                      {Array.isArray(g.member) ? g.member.length : g.member ? 1 : 0}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/groups/${encodeURIComponent(g.cn)}/edit`}>
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
