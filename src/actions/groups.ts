'use server'

import { getSessionCached } from '@/queries/session'
import { auditService, groupService } from '@/services/container'
import type { InternalError, MissingVariableError } from '@/types/error'
import type { Result } from '@/types/utils'
import { errorResult } from '@/utils/error'

export async function updateGroup(
  id: string,
  changes: { name?: string; description?: string; member?: string[] },
): Promise<Result<number, InternalError>> {
  await getSessionCached()
  const groupResult = await groupService.update(id, changes)

  if (!groupResult.ok) {
    await auditService.log({
      action: 'group.update',
      actor: 'server-action',
      target: id,
      success: false,
      error: groupResult.error.message,
    })
    return errorResult('Internal', 'Error while changing group')
  }
  await auditService.log({
    action: 'group.update',
    actor: 'server-action',
    target: id,
    details: { fields: Object.keys(changes) },
    success: true,
  })

  return { ok: true, value: groupResult.value } as const
}

export async function addMemberToGroup(
  id: string,
  dn: string,
): Promise<Result<null, InternalError | MissingVariableError>> {
  await getSessionCached()
  if (!dn) return errorResult('MissingVariable', 'DN is required')

  const resultGroup = await groupService.addMember(id, dn.trim())

  if (!resultGroup.ok) {
    await auditService.log({
      action: 'group.member_add',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: false,
      error: resultGroup.error.message,
    })
    return errorResult('Internal', 'Error while adding group')
  }

  await auditService.log({
    action: 'group.member_add',
    actor: 'server-action',
    target: id,
    details: { memberDn: dn },
    success: true,
  })
  return { ok: true, value: null } as const
}

export async function removeMemberFromGroup(
  id: string,
  dn: string,
): Promise<Result<null, InternalError | MissingVariableError>> {
  await getSessionCached()
  if (!dn) return errorResult('MissingVariable', 'DN is required')

  const result = await groupService.removeMember(id, dn.trim())

  if (!result.ok) {
    await auditService.log({
      action: 'group.member_remove',
      actor: 'server-action',
      target: id,
      details: { memberDn: dn },
      success: false,
      error: result.error.message,
    })
    return errorResult('Internal', 'Error while removing group')
  }

  await auditService.log({
    action: 'group.member_remove',
    actor: 'server-action',
    target: id,
    details: { memberDn: dn },
    success: true,
  })
  return { ok: true, value: null } as const
}
