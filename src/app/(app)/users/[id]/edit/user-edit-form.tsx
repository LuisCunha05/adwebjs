'use client'

import { Button } from '@compound/button'
import { FolderTree } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { removeMemberFromGroup } from '@/actions/groups'
import {
  deleteUser,
  disableUser,
  enableUser,
  moveUser,
  resetPassword,
  unlockUser,
  updateUser,
} from '@/actions/users'
import { useAuth } from '@/components/auth-provider'
import { Modal } from '@/components/compound/modal'
import { Badge } from '@/components/ui/badge'
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

const UAC_DISABLED = 2
const UAC_DONT_EXPIRE_PASSWD = 65536

function flagsToUac(
  current: number | string | undefined,
  accountDisabled: boolean,
  passwordNeverExpires: boolean,
) {
  const base = Number(current) || 512
  return String(
    (base & ~(UAC_DISABLED | UAC_DONT_EXPIRE_PASSWD)) |
      (accountDisabled ? UAC_DISABLED : 0) |
      (passwordNeverExpires ? UAC_DONT_EXPIRE_PASSWD : 0),
  )
}

function cnFromDn(dn: string): string {
  const m = dn.match(/^CN=([^,]+)/i)
  return m ? m[1] : dn
}

function parentOuFromDn(dn: string): string {
  const idx = dn.indexOf(',')
  return idx >= 0 ? dn.slice(idx + 1).trim() : ''
}

function dnMatch(a: string, b: string): boolean {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim()
}

function toFormValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return (value[0] != null ? String(value[0]) : '') as string
  return String(value)
}

interface UserEditFormProps {
  initialUser: any
  editConfig: { fetch: string[]; edit: EditAttribute[] }
  ous: { dn: string; ou?: string; name?: string }[]
}

export function UserEditForm({ initialUser, editConfig, ous }: UserEditFormProps) {
  const router = useRouter()
  const { session } = useAuth()

  const id = initialUser?.sAMAccountName

  const [updateState, submitAction, isSaving] = useActionState(
    async (prevState: any, formData: FormData) => {
      if (!id || !editConfig) return prevState
      try {
        const isAccountDisabled = formData.get('accountDisabled') === 'desativada'
        const isPasswordNeverExpires = formData.get('passwordNeverExpires') === 'sim'
        const uac = flagsToUac(
          prevState?.userAccountControl ?? initialUser.userAccountControl,
          isAccountDisabled,
          isPasswordNeverExpires,
        )
        const body: Record<string, unknown> = { userAccountControl: uac }
        for (const a of editConfig.edit) {
          const v = formData.get(a.name)
          if (typeof v === 'string' && v.trim() !== '') body[a.name] = v.trim()
          else if (v !== null && v !== '') body[a.name] = v
        }

        const res = await updateUser(id, body)
        if (!res.ok) throw new Error(res.error)

        toast.success('Usuário atualizado.')
        return res.data
      } catch (err: any) {
        toast.error(err.message || 'Erro ao salvar.')
        return prevState
      }
    },
    initialUser,
  )

  const user = updateState || initialUser

  const [isPendingDisable, startDisable] = useTransition()
  const [isPendingEnable, startEnable] = useTransition()
  const [isPendingUnlock, startUnlock] = useTransition()
  const [isPendingReset, startReset] = useTransition()
  const [isPendingDelete, startDelete] = useTransition()
  const [isPendingMove, startMove] = useTransition()
  const [isPendingGroupRemove, startGroupRemove] = useTransition()

  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null)

  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableTargetOu, setDisableTargetOu] = useState('')
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdValue, setResetPwdValue] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [moveOuDialogOpen, setMoveOuDialogOpen] = useState(false)
  const [moveOuTarget, setMoveOuTarget] = useState('')
  const [ousForMove, setOusForMove] = useState<{ dn: string; ou?: string; name?: string }[]>([])

  const sections = useMemo(() => {
    if (!editConfig?.edit.length) return []
    const bySection = new Map<string, EditAttribute[]>()
    for (const e of editConfig.edit) {
      if (!bySection.has(e.section)) bySection.set(e.section, [])
      bySection.get(e.section)!.push(e)
    }
    const order = [...new Set(editConfig.edit.map((x) => x.section))]
    return order.map((name) => ({ name, attrs: bySection.get(name) ?? [] }))
  }, [editConfig?.edit])

  function openDisableDialog() {
    setDisableTargetOu('')
    setDisableDialogOpen(true)
  }

  function openMoveOuDialog() {
    const current = user?.dn ? parentOuFromDn(user.dn) : ''
    setMoveOuTarget(current)
    setMoveOuDialogOpen(true)

    const list = ous ?? []
    const hasCurrent = current && list.some((o) => dnMatch(o.dn, current))
    if (current && !hasCurrent) {
      setOusForMove([{ dn: current, ou: current, name: current }, ...list])
    } else {
      setOusForMove(list)
    }
  }

  function handleMoveOu() {
    startMove(async () => {
      if (!id || !moveOuTarget.trim()) return
      const current = user?.dn ? parentOuFromDn(user.dn) : ''
      if (dnMatch(moveOuTarget, current)) {
        toast.info('O usuário já está nesta OU.')
        return
      }
      try {
        const res = await moveUser(id, moveOuTarget.trim())
        if (!res.ok) throw new Error(res.error)

        toast.success('Usuário movido para a nova OU.')
        setMoveOuDialogOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao mover usuário.')
      }
    })
  }

  function handleDisablePermanent() {
    startDisable(async () => {
      if (!id) return
      try {
        const res = await disableUser(
          id,
          disableTargetOu ? { targetOu: disableTargetOu } : undefined,
        )
        if (!res.ok) throw new Error(res.error)

        toast.success(
          disableTargetOu
            ? 'Conta desativada e usuário movido para a OU informada.'
            : 'Conta desativada.',
        )
        setDisableDialogOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao desativar.')
      }
    })
  }

  function handleEnable() {
    startEnable(async () => {
      if (!id) return
      try {
        const res = await enableUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Conta ativada.')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao ativar.')
      }
    })
  }

  function handleUnlock() {
    startUnlock(async () => {
      if (!id) return
      try {
        const res = await unlockUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Conta desbloqueada.')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao desbloquear.')
      }
    })
  }

  function handleRemoveFromGroup(groupDn: string) {
    const groupCn = cnFromDn(groupDn)
    setRemovingGroupId(groupCn)
    startGroupRemove(async () => {
      if (!id || !user?.dn) {
        setRemovingGroupId(null)
        return
      }
      try {
        const res = await removeMemberFromGroup(groupCn, user.dn)
        if (!res.ok) throw new Error(res.error)

        toast.success(`Removido do grupo ${groupCn}.`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao remover do grupo.')
      } finally {
        setRemovingGroupId(null)
      }
    })
  }

  function handleResetPassword() {
    startReset(async () => {
      if (!id || !resetPwdValue.trim() || resetPwdValue.length < 8) return
      try {
        const res = await resetPassword(id, resetPwdValue)
        if (!res.ok) throw new Error(res.error)

        toast.success('Senha redefinida.')
        setResetPwdOpen(false)
        setResetPwdValue('')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao redefinir senha.')
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      if (!id) return
      try {
        const res = await deleteUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Usuário excluído.')
        setDeleteDialogOpen(false)
        router.replace('/users')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao excluir.')
      }
    })
  }

  const isDisabled = (Number(user.userAccountControl) || 0) & UAC_DISABLED
  const isPwdNeverExpires = (Number(user.userAccountControl) || 0) & UAC_DONT_EXPIRE_PASSWD

  const memberOfList = Array.isArray(user.memberOf)
    ? user.memberOf
    : user.memberOf
      ? [user.memberOf]
      : []
  const currentOuDn = parentOuFromDn(user.dn || '')
  const currentOuDisplay = ous.length
    ? ous.find((o) => dnMatch(o.dn, currentOuDn))?.ou ||
      ous.find((o) => dnMatch(o.dn, currentOuDn))?.name ||
      currentOuDn
    : currentOuDn

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" leftIcon="arrow-left" asChild>
          <Link href="/users">
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {user.sAMAccountName}
            {isDisabled ? (
              <Badge variant="destructive">Desativada</Badge>
            ) : (
              <Badge variant="secondary">Ativa</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            Atributos e ações do usuário no Active Directory.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
          <CardDescription>Ativar, desativar ou desbloquear a conta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isDisabled ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleEnable}
              disabled={isPendingEnable}
              loading={isPendingEnable}
              leftIcon="user-check"
              text="Ativar conta"
            />
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={openDisableDialog}
              disabled={isPendingDisable}
              leftIcon="user-x"
              text="Desativar conta"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlock}
            disabled={isPendingUnlock}
            loading={isPendingUnlock}
            leftIcon="unlock"
            text="Desbloquear conta"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetPwdValue('')
              setResetPwdOpen(true)
            }}
            disabled={isPendingReset}
            loading={isPendingReset}
            leftIcon="key-round"
            text="Redefinir senha"
          />
          {session?.canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isPendingDelete}
              loading={isPendingDelete}
              leftIcon="trash-2"
              text="Excluir usuário"
            />
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="size-4" />
            Unidade organizacional
          </CardTitle>
          <CardDescription>
            OU em que o usuário está atualmente. Use &quot;Mover para outra OU&quot; para mudar de
            pasta sem desativar a conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 rounded-md border bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">OU atual</p>
              <p className="font-medium truncate" title={currentOuDn}>
                {currentOuDisplay || '—'}
              </p>
              {currentOuDn && currentOuDisplay !== currentOuDn && (
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={currentOuDn}>
                  {currentOuDn}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openMoveOuDialog}
              loading={isPendingMove}
              leftIcon="arrow-right-left"
              text="Mover para outra OU"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Atributos</CardTitle>
          <CardDescription>
            Dados configurados para o AD. Edite o que for necessário.
          </CardDescription>
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
                        type={
                          a.name === 'mail' ? 'email' : a.name === 'wWWHomePage' ? 'url' : 'text'
                        }
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
                <Select
                  name="passwordNeverExpires"
                  defaultValue={isPwdNeverExpires ? 'sim' : 'nao'}
                >
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

      {memberOfList.length > 0 && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Grupos</CardTitle>
            <CardDescription>
              Grupos dos quais este usuário é membro. Remover daqui não altera o grupo, apenas a
              associação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {memberOfList.map((dn: string) => {
                const cn = cnFromDn(dn)
                const loadingRm = isPendingGroupRemove && removingGroupId === cn
                return (
                  <li key={dn} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm truncate flex-1" title={dn}>
                      {cn}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFromGroup(dn)}
                      disabled={isPendingGroupRemove}
                      loading={loadingRm}
                      text="Remover do grupo"
                    />
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Modal
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        title="Desativação permanente"
        description="Opcionalmente mova o usuário para outra OU após desativar (ex.: OU de desativados) ou mantenha no mesmo lugar."
        handleConfirm={handleDisablePermanent}
        confirmButtonProps={{
          variant: 'destructive',
          disabled: isPendingDisable,
          loading: isPendingDisable,
          loadingText: 'Desativando…',
          text: 'Desativar',
        }}
      >
        <div className="space-y-2 py-2">
          <Label>Destino após desativar</Label>
          <Select
            value={disableTargetOu || 'keep'}
            onValueChange={(v) => setDisableTargetOu(v === 'keep' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Manter no mesmo lugar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Manter no mesmo lugar</SelectItem>
              {ous.map((ou) => (
                <SelectItem key={ou.dn} value={ou.dn}>
                  {ou.ou ?? ou.name ?? ou.dn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Modal>

      <Modal
        open={moveOuDialogOpen}
        onOpenChange={setMoveOuDialogOpen}
        className="sm:max-w-md"
        title={
          <span className="flex items-center gap-2">
            <FolderTree className="size-4" />
            Mover usuário para outra OU
          </span>
        }
        description="Escolha a unidade organizacional de destino. O usuário permanecerá ativo; apenas a localização no AD será alterada."
        handleConfirm={handleMoveOu}
        confirmButtonProps={{
          disabled: !moveOuTarget.trim() || isPendingMove || dnMatch(moveOuTarget, currentOuDn),
          loading: isPendingMove,
          loadingText: 'Movendo…',
          text: 'Mover',
          leftIcon: isPendingMove ? undefined : 'arrow-right-left',
        }}
      >
        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">OU atual</p>
            <p className="font-medium text-sm truncate" title={currentOuDn}>
              {currentOuDisplay || currentOuDn || '—'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Nova OU de destino</Label>
            <Select
              value={moveOuTarget || '__none__'}
              onValueChange={(v) => setMoveOuTarget(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a OU" />
              </SelectTrigger>
              <SelectContent>
                {ousForMove.map((ou) => (
                  <SelectItem key={ou.dn} value={ou.dn} title={ou.dn}>
                    {ou.ou ?? ou.name ?? ou.dn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A conta não será desativada. Para desativar e mover ao mesmo tempo, use
              &quot;Desativar conta&quot; nas ações rápidas.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={resetPwdOpen}
        onOpenChange={setResetPwdOpen}
        title="Redefinir senha"
        description="Defina uma nova senha para este usuário. Ele precisará usá-la no próximo login."
        handleConfirm={handleResetPassword}
        confirmButtonProps={{
          disabled: !resetPwdValue.trim() || resetPwdValue.length < 8 || isPendingReset,
          loading: isPendingReset,
          text: 'Redefinir',
        }}
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            value={resetPwdValue}
            onChange={(e) => setResetPwdValue(e.target.value)}
            placeholder="Mín. 8 caracteres"
            minLength={8}
          />
        </div>
      </Modal>

      <Modal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir usuário"
        description={`Esta ação não pode ser desfeita. O usuário "${user?.sAMAccountName}" será removido permanentemente do Active Directory.`}
        handleConfirm={handleDelete}
        confirmButtonProps={{
          variant: 'destructive',
          disabled: isPendingDelete,
          loading: isPendingDelete,
          text: 'Excluir permanentemente',
        }}
      />
    </div>
  )
}
