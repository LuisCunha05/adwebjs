import { listOUs } from "@/app/actions/ous";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen } from "lucide-react";

export default async function OUsPage() {
  const res = await listOUs();
  const list = res.ok && res.data ? res.data : [];
  const error = res.ok ? null : res.error;

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
          {list.length === 0 ? (
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
                {list.map((ou: any) => (
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
