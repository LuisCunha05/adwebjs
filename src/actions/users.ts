'use server'

import { LDAP_GROUP_DELETE } from '@/constants/config'
import { getSessionCached } from '@/queries/session'
import type { ActiveDirectoryUser, UpdateUserInput } from '@/schemas/attributesAd'
import { auditService, authService, userService } from '@/services/container'
import type { InternalError } from '@/types/error'
import type { Result } from '@/types/utils'
import { errorResult } from '@/utils/error'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function moveUser(id: string, targetOuDn: string): Promise<ActionResult> {
  await getSessionCached()
  if (!targetOuDn) return { ok: false, error: 'targetOuDn é obrigatório' }
  try {
    await userService.moveOu(id, targetOuDn)
    await auditService.log({
      action: 'user.move',
      actor: 'server-action',
      target: id,
      details: { targetOuDn },
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.move',
      actor: 'server-action',
      target: id,
      details: { targetOuDn },
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Move failed' }
  }
}

import { getEditConfig } from '@/services/ad-user-attributes'

const UAC_DISABLED = 2
const UAC_DONT_EXPIRE_PASSWD = 65536

function flagsToUac(current: number | string | undefined, passwordNeverExpires: boolean) {
  const base = Number(current) || 512
  return String(
    (base & ~(UAC_DISABLED | UAC_DONT_EXPIRE_PASSWD)) |
      (passwordNeverExpires ? UAC_DONT_EXPIRE_PASSWD : 0),
  )
}

export async function updateUser(
  prevState: Result<ActiveDirectoryUser, InternalError> | null,
  formData: FormData,
): Promise<Result<ActiveDirectoryUser, InternalError>> {
  await getSessionCached()
  const id = formData.get('id')?.toString()
  if (!id) {
    return errorResult('Internal', 'ID do usuário não fornecido')
  }

  try {
    const editConfig = getEditConfig()
    const currentUserRes = await userService.get(id)
    if (!currentUserRes.ok) {
      return errorResult('Internal', 'Usuário não encontrado')
    }

    const currentUac = prevState?.ok
      ? prevState.value.userAccountControl
      : currentUserRes.value.userAccountControl

    const isPasswordNeverExpires = formData.get('passwordNeverExpires') === 'sim'
    const uac = flagsToUac(currentUac, isPasswordNeverExpires)

    const body: Record<string, unknown> = { userAccountControl: uac }
    for (const a of editConfig) {
      const v = formData.get(a.name)
      if (typeof v === 'string' && v.trim() !== '') body[a.name] = v.trim()
      else if (v !== null && v !== '') body[a.name] = v
    }

    const updated = await userService.update(id, body)
    if (!updated.ok) {
      await auditService.log({
        action: 'user.update',
        actor: 'server-action',
        target: id,
        success: false,
        error: updated.error.message,
      })
      return errorResult('Internal', 'Error while updating user')
    }

    await auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      details: { fields: Object.keys(body) },
      success: true,
    })
    return { ok: true, value: updated.value }
  } catch (err: any) {
    await auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return errorResult('Internal', err.message || 'Update failed')
  }
}

export async function disableUser(id: string, targetOu?: string): Promise<ActionResult> {
  await getSessionCached()
  try {
    await authService.disableUser(id, targetOu)
    await auditService.log({
      action: 'user.disable',
      actor: 'server-action',
      target: id,
      details: { targetOu: targetOu ?? 'sem ou destino' },
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.disable',
      actor: 'server-action',
      target: id,
      success: false,
      error: err?.message,
    })
    return { ok: false, error: err.message || 'Disable failed' }
  }
}

export async function enableUser(id: string): Promise<ActionResult> {
  await getSessionCached()
  try {
    await authService.enableUser(id)
    await auditService.log({
      action: 'user.enable',
      actor: 'server-action',
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.enable',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Enable failed' }
  }
}

export async function unlockUser(id: string): Promise<ActionResult> {
  await getSessionCached()
  try {
    await authService.unlockUser(id)
    await auditService.log({
      action: 'user.unlock',
      actor: 'server-action',
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.unlock',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Unlock failed' }
  }
}

export async function resetPassword(id: string, newPassword: string): Promise<ActionResult> {
  await getSessionCached()
  if (!newPassword) return { ok: false, error: 'Password required' }
  try {
    await authService.setPassword(id, newPassword)
    await auditService.log({
      action: 'user.reset_password',
      actor: 'server-action',
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.reset_password',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Reset password failed' }
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const session = await getSessionCached()
  try {
    if (!LDAP_GROUP_DELETE) return { ok: false, error: 'O sistema não permite essa ação' }
    const currentUser = await userService.get(session.user.sAMAccountName)

    if (!currentUser.ok) {
      return { ok: false, error: 'Ação não permitida' } as const
    }

    const user = currentUser.value
    if (!user.memberOf?.includes(LDAP_GROUP_DELETE))
      return { ok: false, error: 'Ação não permitida' }

    await authService.deleteUser(id)
    await auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    await auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Delete failed' }
  }
}

export async function createUser(body: any): Promise<ActionResult<any>> {
  await getSessionCached()
  try {
    const user = await userService.create(body)
    await auditService.log({
      action: 'user.create',
      actor: 'server-action',
      target: body.sAMAccountName,
      details: { parentOuDn: body.parentOuDn },
      success: true,
    })
    return { ok: true, data: user }
  } catch (err: any) {
    await auditService.log({
      action: 'user.create',
      actor: 'server-action',
      target: String(body.sAMAccountName),
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Create failed' }
  }
}
