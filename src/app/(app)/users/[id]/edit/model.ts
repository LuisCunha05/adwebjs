import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { removeMemberFromGroup } from '@/actions/groups'
import { updateUser } from '@/actions/users'
import { useSession } from '@/components/auth-provider'
import type { ActiveDirectoryUser } from '@/schemas/attributesAd'
import type { EditAttribute } from '@/types/ldap'

const UAC_DISABLED = 2
const UAC_DONT_EXPIRE_PASSWD = 65536

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
  initialUser: ActiveDirectoryUser
  editConfig: { fetch: string[]; edit: EditAttribute[] }
}

export function useUserModel({ initialUser, editConfig }: UseUserModelProps) {
  const router = useRouter()
  const session = useSession()

  const id = initialUser?.sAMAccountName

  const initialState = useMemo(() => ({ ok: true, value: initialUser }) as const, [initialUser])
  const [updateState, submitAction, isSaving] = useActionState(updateUser, initialState)

  useEffect(() => {
    if (updateState === initialState) return
    if (!updateState.ok) {
      toast.error(updateState.error.message || 'Erro ao salvar.')
    } else {
      toast.success('Usuário atualizado.')
    }
  }, [updateState, initialState])

  const user = updateState?.ok ? updateState.value : initialUser

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
      const res = await removeMemberFromGroup(groupCn, user.dn)
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }

      toast.success(`Removido do grupo ${groupCn}.`)
      router.refresh()
      setRemovingGroupId(null)
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
