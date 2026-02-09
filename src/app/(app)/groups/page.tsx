import Link from "next/link";
import { listGroups } from "@/actions/groups";
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
import { Pencil } from "lucide-react";
import { GroupsSearch } from "./groups-search";
import { verifySession } from "@/utils/manage-jwt";

export default async function GroupsPage(props: { searchParams: Promise<{ q?: string }> }) {
  await verifySession();
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";

  let list: any[] = [];
  let error: string | undefined;

  if (q) {
    const res = await listGroups(q);
    if (res.ok && res.data) {
      list = res.data;
    } else {
      error = res.error;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grupos</h1>
        <p className="text-muted-foreground mt-1">
          Pesquise e edite grupos do Active Directory.
        </p>
      </div>

      <GroupsSearch />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
          <CardDescription>
            {q
              ? list.length === 0
                ? "Nenhum resultado."
                : `${list.length} grupo(s) encontrado(s).`
              : "Use a pesquisa acima para listar grupos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!q ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Digite um termo e clique em Buscar.
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {error ? <span className="text-destructive">{error}</span> : `Nenhum grupo encontrado para "${q}".`}
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
