import { useRouter } from 'next/navigation'
import { useActionState, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { removeMemberFromGroup } from '@/actions/groups'
import {
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

  const [isPendingGroupRemove, startGroupRemove] = useTransition()

  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null)

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
    isPendingGroupRemove,
    removingGroupId,
    handleRemoveFromGroup,
    canDelete: !!session?.canDelete,
  }
}
