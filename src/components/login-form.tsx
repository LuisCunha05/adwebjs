"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

const DEFAULT_STATE = {
  username: '',
  error: undefined
}

export function LoginForm() {

  const [state, action, isPending] = useActionState(loginAction, DEFAULT_STATE)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[380px]">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="size-6" />
            </div>
            <CardTitle className="text-xl">AD Web Manager</CardTitle>
            <CardDescription>Entre com seu usuário do domínio</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              {state.error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {state.error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Usuário ou e-mail</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="usuário ou email"
                  defaultValue={state.username}
                  required
                  disabled={isPending}
                  className="transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="sua senha"
                  required
                  disabled={isPending}
                  className="transition-colors"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Entrando…" : "Entrar"}
              </Button>
            </form>
            <p className="text-muted-foreground mt-4 text-center text-xs">
              © {new Date().getFullYear()} AD Web Manager
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
