import Link from "next/link";
import { listUsers } from "@/actions/users";
import { listOUs } from "@/actions/ous";
import { Button } from "@/components/ui/button";
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
import { Pencil, UserPlus, Download } from "lucide-react";
import { UsersSearch } from "./users-search";
import { DownloadButton } from "./download-button";
import { verifySession } from "@/utils/manage-jwt";

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

export default async function UsersPage(props: { searchParams: Promise<{ q?: string; searchBy?: string; ou?: string; memberOf?: string; disabledOnly?: string }> }) {
  await verifySession();
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  const searchBy = searchParams.searchBy || "sAMAccountName";
  const ou = searchParams.ou || "";
  const memberOf = searchParams.memberOf || "";
  const disabledOnly = searchParams.disabledOnly === "true";

  // Parallel fetch: OUs always needed for search filter
  const ousPromise = listOUs();

  let list: any[] = [];
  let error: string | undefined;

  // Only fetch users if there's a query or filters, as per original logic "Informe um termo... ou use os filtros"
  const hasFilters = !!(ou || memberOf || disabledOnly);

  if (q.trim() || hasFilters) {
    const res = await listUsers(q, searchBy, { ou: ou || undefined, memberOf: memberOf || undefined, disabledOnly: disabledOnly || undefined });
    if (res.ok && res.data) {
      list = res.data;
    } else {
      error = res.error;
    }
  }

  const ousRes = await ousPromise;
  const ous = ousRes.ok && ousRes.data ? ousRes.data : [];

  const hasSearched = q.trim() || hasFilters;

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

      <UsersSearch ous={ous} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Resultados</CardTitle>
            <CardDescription>
              {!hasSearched
                ? "Use a pesquisa acima para listar usuários."
                : list.length === 0
                  ? "Nenhum resultado."
                  : `${list.length} usuário(s) encontrado(s).`}
            </CardDescription>
          </div>
          {list.length > 0 && (
            <DownloadButton users={list} />
          )}
        </CardHeader>
        <CardContent>
          {!hasSearched ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Digite um termo (ou use filtros) e clique em Buscar.
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {error ? <span className="text-destructive">{error}</span> : "Nenhum usuário encontrado."}
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
