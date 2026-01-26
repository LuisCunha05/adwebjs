"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, FolderTree, FolderOpen, UserX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { stats as statsApi } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<{ usersCount: number; disabledCount: number; groupsCount: number } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    setStatsError(null);
    statsApi
      .get()
      .then((s) => {
        setStats(s);
        setStatsError(null);
      })
      .catch((err) => {
        setStats({ usersCount: 0, disabledCount: 0, groupsCount: 0 });
        const msg = err?.message ?? "Erro ao carregar estatísticas.";
        setStatsError(
          msg === "Not Found" || msg === "Not Found."
            ? "Serviço não encontrado. Verifique se a API está em execução e se a sessão é válida (faça login de novo)."
            : msg
        );
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active Directory Web Manager</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie usuários, grupos e OUs do AD de forma centralizada.
        </p>
      </div>

      {statsError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {statsError}
        </div>
      )}
      {stats !== null ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuários</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usersCount}</div>
              <p className="text-xs text-muted-foreground">contas no diretório</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Desativadas</CardTitle>
              <UserX className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.disabledCount}</div>
              <p className="text-xs text-muted-foreground">contas desativadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Grupos</CardTitle>
              <FolderTree className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.groupsCount}</div>
              <p className="text-xs text-muted-foreground">grupos no diretório</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>
            <CardTitle className="mt-3">Usuários</CardTitle>
            <CardDescription>Pesquisar, editar, ativar/desativar e desbloquear contas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/users">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="size-6" />
            </div>
            <CardTitle className="mt-3">Grupos</CardTitle>
            <CardDescription>Pesquisar grupos e gerenciar membros com busca.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/groups">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="size-6" />
            </div>
            <CardTitle className="mt-3">OUs</CardTitle>
            <CardDescription>Listar e navegar pelas unidades organizacionais.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/ous">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
