"use client";

import { useState, useEffect } from "react";
import { ous as ousApi, ApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

function friendlyMessage(err: unknown): string {
  const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? "Erro ao carregar OUs.";
  if (msg === "Not Found" || msg === "Not Found.") {
    return "Serviço não encontrado. Verifique se a API está em execução e se a sessão é válida (faça login de novo).";
  }
  return msg;
}

export default function OUsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    ousApi
      .list()
      .then((r) => {
        setList(r.ous ?? []);
        setError(null);
      })
      .catch((err) => {
        setList([]);
        const msg = friendlyMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Unidades organizacionais</h1>
      <p className="text-muted-foreground mt-1">
        OUs do Active Directory no domínio configurado.
      </p>
    </div>
    {error && (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        {error}
      </div>
    )}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="size-4" />
          OUs
        </CardTitle>
        <CardDescription>
          {list.length} unidade(s) organizacional(is) encontrada(s).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma OU encontrada ou não foi possível carregar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome (OU)</TableHead>
                <TableHead>Nome de exibição</TableHead>
                <TableHead className="max-w-[300px] truncate">DN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((ou) => (
                <TableRow key={ou.dn}>
                  <TableCell className="font-medium">{ou.ou ?? ou.name ?? "—"}</TableCell>
                  <TableCell>{ou.name ?? ou.ou ?? "—"}</TableCell>
                  <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground" title={ou.dn}>
                    {ou.dn ?? "—"}
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
