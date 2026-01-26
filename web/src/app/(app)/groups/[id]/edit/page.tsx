"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { groups as groupsApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function GroupEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", member: "" });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    groupsApi
      .get(id)
      .then((g) => {
        if (!cancelled) {
          setGroup(g);
          const members = g.member;
          const memberStr = Array.isArray(members)
            ? members.join("\n")
            : typeof members === "string"
              ? members
              : "";
          setForm({ name: g.name ?? g.cn ?? "", member: memberStr });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Grupo não encontrado.");
          router.replace("/groups");
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
      const memberList = form.member
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean);
      await groupsApi.update(id, {
        name: form.name || undefined,
        member: memberList,
      });
      toast.success("Grupo atualizado.");
      router.push("/groups");
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

  if (!group) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar grupo: {group.cn}
          </h1>
          <p className="text-muted-foreground text-sm">
            Alterar nome e membros do grupo no Active Directory.
          </p>
        </div>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Atributos</CardTitle>
          <CardDescription>
            Um DN por linha na lista de membros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cn">Nome comum (cn)</Label>
              <Input
                id="cn"
                value={group.cn ?? ""}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member">Membros (DNs)</Label>
              <Textarea
                id="member"
                rows={6}
                placeholder="CN=User,OU=Users,DC=example,DC=com"
                value={form.member}
                onChange={(e) => setForm((f) => ({ ...f, member: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/groups">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
