'use server'

import { LDAP_GROUP_DELETE } from '@/constants/config'
import { ActiveDirectoryUser, UpdateUserInput } from '@/schemas/attributesAd'
import { auditService, ldapService } from '@/services/container'
import { PaginatedResult } from '@/types/ldap'

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
    await ldapService.moveUserToOu(id, targetOuDn)
    auditService.log({
      action: 'user.move',
      actor: 'server-action',
      target: id,
      details: { targetOuDn },
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
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

export async function getUser(id: string): Promise<ActionResult<any>> {
  await verifySession()
  try {
    const user = await ldapService.getUser(id)
    // Serialize pure object to avoid "Only plain objects can be passed to Client Components" issues with complex LDAP objects if any
    return { ok: true, data: JSON.parse(JSON.stringify(user)) }
  } catch (err: any) {
    return { ok: false, error: err.message || 'User not found' }
  }
}

export async function updateUser(
  id: string,
  data: UpdateUserInput,
): Promise<ActionResult<ActiveDirectoryUser>> {
  await verifySession()
  try {
    const updated = await ldapService.updateUser(id, data)
    auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      details: { fields: Object.keys(data) },
      success: true,
    })
    return { ok: true, data: JSON.parse(JSON.stringify(updated)) }
  } catch (err: any) {
    auditService.log({
      action: 'user.update',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Update failed' }
  }
}

export async function disableUser(id: string, opts?: { targetOu?: string }): Promise<ActionResult> {
  await verifySession()
  try {
    await ldapService.disableUser(id, opts)
    auditService.log({
      action: 'user.disable',
      actor: 'server-action',
      target: id,
      details: opts,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
      action: 'user.disable',
      actor: 'server-action',
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Disable failed' }
  }
}

export async function enableUser(id: string): Promise<ActionResult> {
  await verifySession()
  try {
    await ldapService.enableUser(id)
    auditService.log({ action: 'user.enable', actor: 'server-action', target: id, success: true })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
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
    await ldapService.unlockUser(id)
    auditService.log({ action: 'user.unlock', actor: 'server-action', target: id, success: true })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
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
    await ldapService.setPassword(id, newPassword)
    auditService.log({
      action: 'user.reset_password',
      actor: 'server-action',
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
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
    const currentUser = await ldapService.getUser(session.user.sAMAccountName)

    if (!Array.isArray(currentUser.memberOf) || !currentUser.memberOf.includes(LDAP_GROUP_DELETE))
      return { ok: false, error: 'Ação não permitida' }

    await ldapService.deleteUser(id)
    auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: true,
    })
    return { ok: true }
  } catch (err: any) {
    auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Delete failed' }
  }
}

export async function listUsers(
  q: string,
  searchBy: string,
  opts?: {
    ou?: string
    memberOf?: string
    disabledOnly?: boolean
    page?: number
    pageSize?: number
  },
): Promise<ActionResult<PaginatedResult<ActiveDirectoryUser> | ActiveDirectoryUser[]>> {
  await verifySession()
  if (!q && !opts?.ou && !opts?.memberOf && !opts?.disabledOnly)
    return { ok: true, data: [] }
  try {
    const result = await ldapService.searchUsers(q, searchBy, opts)
    return { ok: true, data: result }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Search failed' }
  }
}

export async function createUser(body: any): Promise<ActionResult<any>> {
  await verifySession()
  try {
    const user = await ldapService.createUser(body)
    auditService.log({
      action: 'user.create',
      actor: 'server-action',
      target: body.sAMAccountName,
      details: { parentOuDn: body.parentOuDn },
      success: true,
    })
    return { ok: true, data: user }
  } catch (err: any) {
    auditService.log({
      action: 'user.create',
      actor: 'server-action',
      target: String(body.sAMAccountName),
      success: false,
      error: err.message,
    })
    return { ok: false, error: err.message || 'Create failed' }
  }
}
