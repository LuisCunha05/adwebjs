import Link from "next/link";
import { Users, FolderTree } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Active Directory Web Manager
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie usuários e grupos do AD de forma centralizada.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>
            <CardTitle className="mt-3">Usuários</CardTitle>
            <CardDescription>
              Pesquisar, editar e gerenciar contas de usuário.
            </CardDescription>
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
            <CardDescription>
              Pesquisar grupos e gerenciar membros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/groups">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
