import { useRouter } from 'next/navigation'
import { useActionState, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { removeMemberFromGroup } from '@/actions/groups'
import {
  deleteUser,
  disableUser,
  enableUser,
  resetPassword,
  unlockUser,
  updateUser,
} from '@/actions/users'
import { useAuth, useSession } from '@/components/auth-provider'
import type { EditAttribute } from '@/types/ldap'

const UAC_DISABLED = 2
const UAC_DONT_EXPIRE_PASSWD = 65536

export function flagsToUac(
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

export function cnFromDn(dn: string): string {
  const m = dn.match(/^CN=([^,]+)/i)
  return m ? m[1] : dn
}

export function parentOuFromDn(dn: string): string {
  const idx = dn.indexOf(',')
  return idx >= 0 ? dn.slice(idx + 1).trim() : ''
}

export function dnMatch(a: string, b: string): boolean {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim()
}

export interface UseUserModelProps {
  initialUser: any
  editConfig: { fetch: string[]; edit: EditAttribute[] }
}

export function useUserModel({ initialUser, editConfig }: UseUserModelProps) {
  const router = useRouter()
  const session = useSession()

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
  const [isPendingGroupRemove, startGroupRemove] = useTransition()

  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null)

  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableTargetOu, setDisableTargetOu] = useState('')
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdValue, setResetPwdValue] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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

  const isDisabled = Boolean((Number(user.userAccountControl) || 0) & UAC_DISABLED)
  const isPwdNeverExpires = Boolean((Number(user.userAccountControl) || 0) & UAC_DONT_EXPIRE_PASSWD)

  const memberOfList = Array.isArray(user.memberOf)
    ? user.memberOf
    : user.memberOf
      ? [user.memberOf]
      : []


  return {
    user,
    isDisabled,
    isPwdNeverExpires,
    memberOfList,
    sections,
    submitAction,
    isSaving,
    isPendingDisable,
    isPendingEnable,
    isPendingUnlock,
    isPendingReset,
    isPendingDelete,
    isPendingGroupRemove,
    removingGroupId,
    disableDialogOpen,
    setDisableDialogOpen,
    disableTargetOu,
    setDisableTargetOu,
    resetPwdOpen,
    setResetPwdOpen,
    resetPwdValue,
    setResetPwdValue,
    deleteDialogOpen,
    setDeleteDialogOpen,
    openDisableDialog,
    handleDisablePermanent,
    handleEnable,
    handleUnlock,
    handleRemoveFromGroup,
    handleResetPassword,
    handleDelete,
    canDelete: !!session?.canDelete,
  }
}
