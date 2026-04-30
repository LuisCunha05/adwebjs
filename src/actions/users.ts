'use server'

import { LDAP_GROUP_DELETE } from '@/constants/config'
import type { ActiveDirectoryUser, UpdateUserInput } from '@/schemas/attributesAd'
import { auditService, authService, userService } from '@/services/container'

import { verifySession } from '@/utils/manage-jwt'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function moveUser(id: string, targetOuDn: string): Promise<ActionResult> {
  await verifySession()
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

export async function updateUser(
  id: string,
  data: UpdateUserInput,
): Promise<ActionResult<ActiveDirectoryUser>> {
  await verifySession()
  try {
    const updated = await userService.update(id, data)
    await auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      details: { fields: Object.keys(data) },
      success: true,
    })
    return { ok: true, data: JSON.parse(JSON.stringify(updated)) }
  } catch (err: any) {
    await auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Update failed' }
  }
}

export async function disableUser(id: string, targetOu?: string): Promise<ActionResult> {
  await verifySession()
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
  await verifySession()
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
  await verifySession()
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
  await verifySession()
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
  const session = await verifySession()
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
  await verifySession()
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
