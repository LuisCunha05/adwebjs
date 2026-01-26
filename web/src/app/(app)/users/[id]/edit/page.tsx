"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { users as usersApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cn: "",
    sn: "",
    givenName: "",
    userAccountControl: "",
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    usersApi
      .get(id)
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setForm({
            cn: u.cn ?? "",
            sn: u.sn ?? "",
            givenName: u.givenName ?? "",
            userAccountControl: String(u.userAccountControl ?? ""),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Usuário não encontrado.");
          router.replace("/users");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    try {
      await usersApi.update(id, {
        cn: form.cn || undefined,
        sn: form.sn || undefined,
        givenName: form.givenName || undefined,
        userAccountControl: form.userAccountControl ? Number(form.userAccountControl) : undefined,
      });
      toast.success("Usuário atualizado.");
      router.push("/users");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar: {user.sAMAccountName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Alterar atributos do usuário no Active Directory.
          </p>
        </div>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Atributos</CardTitle>
          <CardDescription>
            512 = Conta normal, 514 = Desativada, 66048 = Senha nunca expira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cn">Nome comum (cn)</Label>
                <Input
                  id="cn"
                  value={form.cn}
                  onChange={(e) => setForm((f) => ({ ...f, cn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sn">Sobrenome (sn)</Label>
                <Input
                  id="sn"
                  value={form.sn}
                  onChange={(e) => setForm((f) => ({ ...f, sn: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="givenName">Nome (givenName)</Label>
              <Input
                id="givenName"
                value={form.givenName}
                onChange={(e) => setForm((f) => ({ ...f, givenName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sAMAccountName">Usuário (sAMAccountName)</Label>
              <Input
                id="sAMAccountName"
                value={user.sAMAccountName ?? ""}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userAccountControl">Controle da conta (userAccountControl)</Label>
              <Input
                id="userAccountControl"
                value={form.userAccountControl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, userAccountControl: e.target.value }))
                }
                placeholder="512, 514, 66048..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/users">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
