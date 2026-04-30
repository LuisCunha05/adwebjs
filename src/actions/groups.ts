'use server'

import { auditService, groupService } from '@/services/container'

import { verifySession } from '@/utils/manage-jwt'

interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export async function updateGroup(
  id: string,
  changes: { name?: string; description?: string; member?: string[] },
): Promise<ActionResult<any>> {
  await verifySession()
  try {
    const updated = await groupService.update(id, changes)
    await auditService.log({
      action: 'group.update',
      actor: 'server-action',
      target: id,
      details: { fields: Object.keys(changes) },
      success: true,
    })
    return { ok: true, data: JSON.parse(JSON.stringify(updated)) }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed'
    await auditService.log({
      action: 'group.update',
      actor: 'server-action',
      target: id,
      success: false,
      error: message,
    })
    return { ok: false, error: message }
  }
}

export async function addMemberToGroup(id: string, dn: string): Promise<ActionResult> {
  await verifySession()
  if (!dn) return { ok: false, error: 'dn required' }
  try {
    await groupService.addMember(id, dn.trim())
    await auditService.log({
      action: 'group.member_add',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: true,
    })
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Add member failed'
    await auditService.log({
      action: 'group.member_add',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: false,
      error: message,
    })
    return { ok: false, error: message }
  }
}

export async function removeMemberFromGroup(id: string, dn: string): Promise<ActionResult> {
  await verifySession()
  if (!dn) return { ok: false, error: 'dn required' }
  try {
    await groupService.removeMember(id, dn.trim())
    await auditService.log({
      action: 'group.member_remove',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: true,
    })
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Remove member failed'
    await auditService.log({
      action: 'group.member_remove',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: false,
      error: message,
    })
    return { ok: false, error: message }
  }
}

export async function getGroupMembersResolved(
  id: string,
): Promise<
  ActionResult<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]>
> {
  await verifySession()
  try {
    const group = await groupService.get(id)
    const raw = group.member
    const members = Array.isArray(raw) ? raw : raw != null ? [String(raw)] : []
    if (members.length === 0) return { ok: true, data: [] }

    try {
      const resolved = await ldapService.resolveMemberDns(members)
      return { ok: true, data: JSON.parse(JSON.stringify(resolved)) }
    } catch {
      return { ok: true, data: members.map((dn: string) => ({ dn })) }
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Group not found' }
  }
}
