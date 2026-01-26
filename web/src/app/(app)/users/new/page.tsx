"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { users as usersApi, ous as ousApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const defaultForm = {
  parentOuDn: "",
  sAMAccountName: "",
  password: "",
  confirmPassword: "",
};

export default function NewUserPage() {
  const router = useRouter();
  const [ous, setOus] = useState<{ dn: string; ou?: string; name?: string }[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ousApi.list().then((r) => setOus(r.ous ?? [])).catch(() => setOus([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!form.parentOuDn || !form.sAMAccountName.trim()) {
      toast.error("OU e nome de usuário (sAMAccountName) são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const user = await usersApi.create({
        parentOuDn: form.parentOuDn,
        sAMAccountName: form.sAMAccountName.trim(),
        password: form.password,
      });
      toast.success("Usuário criado. Edite os demais dados na tela de edição.");
      router.replace(`/users/${encodeURIComponent(user.sAMAccountName)}/edit`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar usuário.");
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UserPlus className="size-4" />
            Novo usuário
          </h1>
          <p className="text-muted-foreground text-sm">
            Crie a conta com OU, nome de logon e senha. Os demais atributos podem ser preenchidos depois na edição do usuário.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Dados obrigatórios</CardTitle>
            <CardDescription>OU de destino, nome de logon e senha inicial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>OU de destino *</Label>
              <Select
                value={form.parentOuDn}
                onValueChange={(v) => setForm((f) => ({ ...f, parentOuDn: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OU" />
                </SelectTrigger>
                <SelectContent>
                  {ous.map((ou) => (
                    <SelectItem key={ou.dn} value={ou.dn}>
                      {ou.ou ?? ou.name ?? ou.dn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sAMAccountName">Nome de logon (sAMAccountName) *</Label>
              <Input
                id="sAMAccountName"
                value={form.sAMAccountName}
                onChange={(e) => setForm((f) => ({ ...f, sAMAccountName: e.target.value }))}
                placeholder="Ex.: joao.silva"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Senha inicial *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Criar usuário
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/users">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
