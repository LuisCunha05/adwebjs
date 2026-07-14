'use client'

import { Button } from '@compound/button'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createUser } from '@/actions/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewUserFormProps {
  ous: { dn: string; ou?: string; name?: string }[]
}

export function NewUserForm({ ous }: NewUserFormProps) {
  const router = useRouter()

  const [state, formAction, isPending] = useActionState(createUser, null)

  useEffect(() => {
    if (!state) return
    if (!state.ok) {
      toast.error(state.error.message || 'Erro ao criar usuário.')
    } else {
      toast.success('Usuário criado. Edite os demais dados na tela de edição.')
      router.replace(`/users/${encodeURIComponent(state.state.sAMAccountName)}/edit`)
    }
  }, [state, router])

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
            Crie a conta com OU, nome de logon e senha. Os demais atributos podem ser preenchidos
            depois na edição do usuário.
          </p>
        </div>
      </div>

      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Dados obrigatórios</CardTitle>
            <CardDescription>OU de destino, nome de logon e senha inicial.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>OU de destino *</Label>
              <Select defaultValue={state?.state.parentOuDn} name="parentOuDn" required>
                <SelectTrigger className="w-full">
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
                name="sAMAccountName"
                defaultValue={state?.state.sAMAccountName}
                placeholder="Ex.: joao.silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn">Nome Completo*</Label>
              <Input
                id="cn"
                name="cn"
                defaultValue={state?.state.cn}
                placeholder="Ex.: joao.silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha inicial *</Label>
              <Input id="password" name="password" type="password" required minLength={12} />
              <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={12}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Criar usuário
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/users">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
