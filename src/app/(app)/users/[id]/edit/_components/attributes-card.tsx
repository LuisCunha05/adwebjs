import { Button } from '@compound/button'
import Link from 'next/link'
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
import type { EditAttribute } from '@/types/ldap'

function toFormValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return (value[0] != null ? String(value[0]) : '') as string
  return String(value)
}

interface AttributesCardProps {
  user: any
  sections: { name: string; attrs: EditAttribute[] }[]
  submitAction: (payload: FormData) => void
  isSaving: boolean
  isDisabled: boolean
  isPwdNeverExpires: boolean
}

export function AttributesCard({
  user,
  sections,
  submitAction,
  isSaving,
  isDisabled,
  isPwdNeverExpires,
}: AttributesCardProps) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Atributos</CardTitle>
        <CardDescription>Dados configurados para o AD. Edite o que for necessário.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submitAction} className="space-y-6">
          {sections.map(({ name: sectionName, attrs }) => (
            <div key={sectionName} className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-1">
                {sectionName}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {attrs.map((a) => (
                  <div key={a.name} className={attrs.length === 1 ? 'sm:col-span-2' : ''}>
                    <Label htmlFor={a.name}>{a.label}</Label>
                    <Input
                      id={a.name}
                      name={a.name}
                      type={a.name === 'mail' ? 'email' : a.name === 'wWWHomePage' ? 'url' : 'text'}
                      defaultValue={toFormValue(user[a.name] ?? '')}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 pt-2">
            <Label htmlFor="sAMAccountName">Usuário (sAMAccountName)</Label>
            <Input
              id="sAMAccountName"
              value={user.sAMAccountName ?? ''}
              readOnly
              className="bg-muted max-w-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label>Status da conta</Label>
              <Select name="accountDisabled" defaultValue={isDisabled ? 'desativada' : 'ativa'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="desativada">Desativada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Conta ativa permite login; desativada bloqueia o acesso.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Senha nunca expira</Label>
              <Select name="passwordNeverExpires" defaultValue={isPwdNeverExpires ? 'sim' : 'nao'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Quando &quot;Sim&quot;, o usuário não precisa trocar a senha por política.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving} loading={isSaving} text="Salvar" />
            <Button type="button" variant="outline" asChild>
              <Link href="/users">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
