'use server'

import { LDAP_GROUP_DELETE } from '@/constants/config'
import { getSessionCached } from '@/queries/session'
import type { ActiveDirectoryUser, CreateUserForm } from '@/schemas/attributesAd'
import { CreateUserFormSchema } from '@/schemas/attributesAd'
import { auditService, authService, userService } from '@/services/container'
import type { InternalError, InvalidShapeError } from '@/types/error'
import type { Result,ActionResult } from '@/types/utils'
import { errorResult ,errorActionResult} from '@/utils/error'


export async function moveUser(id: string, targetOuDn: string): Promise<ActionResult<string, InternalError>> {
  await getSessionCached()
  if (!targetOuDn) return errorActionResult(targetOuDn, "Internal", "TargetOu é obrigatório")
  const result = await userService.moveOu(id, targetOuDn)

  if (!result.ok) {
    await auditService.log({
      action: 'user.move',
      actor: 'server-action',
      target: id,
      details: { targetOuDn },
      success: false,
      error: result.error.message,
    })
    return errorActionResult(targetOuDn, "Internal", "Falha ao move usuário")
  }

  await auditService.log({
    action: 'user.move',
    actor: 'server-action',
    target: id,
    details: { targetOuDn },
    success: true,
  })
  return { ok: true, state:targetOuDn }
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

export async function disableUser(id: string, targetOu?: string): Promise<ActionResult<string, InternalError>> {
  await getSessionCached()
  const result = await authService.disableUser(id, targetOu)

  if (!result.ok) {
    await auditService.log({
      action: 'user.disable',
      actor: 'server-action',
      target: id,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(targetOu ?? "", "Internal", "Falha ao desativar usuário")
  }

  await auditService.log({
    action: 'user.disable',
    actor: 'server-action',
    target: id,
    details: { targetOu: targetOu ?? 'sem ou destino' },
    success: true,
  })
  return { ok: true, state: targetOu ?? "" }
}

export async function enableUser(id: string): Promise<ActionResult<null, InternalError>> {
  await getSessionCached()

  const result = await authService.enableUser(id)

  if (!result.ok) {
    await auditService.log({
      action: 'user.enable',
      actor: 'server-action',
      target: id,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(null, "Internal", "Falha ao ativar usuário")
  }

    await auditService.log({
      action: 'user.enable',
      actor: 'server-action',
      target: id,
      success: true,
    })
    return { ok: true, state:null}

}

export async function unlockUser(id: string): Promise<ActionResult<null, InternalError>> {
  await getSessionCached()
  const result = await authService.unlockUser(id)
  if (!result.ok) {
    await auditService.log({
      action: 'user.unlock',
      actor: 'server-action',
      target: id,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(null, "Internal", "Erro ao desbloquear usuário")
  }

  await auditService.log({
    action: 'user.unlock',
    actor: 'server-action',
    target: id,
    success: true,
  })
  return { ok: true, state: null }

}

export async function resetPassword(id: string, newPassword: string): Promise<ActionResult<null, InternalError>> {
  await getSessionCached()
  if (!newPassword) return errorActionResult(null, "Internal", "Senha é necessária")
  const result = await authService.setPassword(id, newPassword)

  if (!result.ok) {
    await auditService.log({
      action: 'user.reset_password',
      actor: 'server-action',
      target: id,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(null, "Internal", "Erro ao trocar senha")
  }
  await auditService.log({
    action: 'user.reset_password',
    actor: 'server-action',
    target: id,
    success: true,
  })
  return { ok: true , state:null}
}

export async function deleteUser(id: string): Promise<ActionResult<null, InternalError>> {
  const session = await getSessionCached()

    if (!LDAP_GROUP_DELETE) return errorActionResult(null, "Internal", 'O sistema não permite essa ação')

    const currentUser = await userService.get(session.user.sAMAccountName)

    if (!currentUser.ok) {
      return errorActionResult(null, "Internal",'Ação não permitida')
    }

    const user = currentUser.value
    if (!user.memberOf?.includes(LDAP_GROUP_DELETE))
      return errorActionResult(null, "Internal",'Ação não permitida')

  const result = await authService.deleteUser(id)

  if (!result.ok) {
    await auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(null, "Internal", "Erro ao excluir usuário")
  }
    await auditService.log({
      action: 'user.delete',
      actor: session.user.sAMAccountName,
      target: id,
      success: true,
    })
    return { ok: true ,state: null}

}

type CreateUserFormWithConfirmation = CreateUserForm & {confirmPassword?:string}

export async function createUser(
  _prevState: ActionResult<CreateUserFormWithConfirmation, InternalError | InvalidShapeError> | null,
  formData: FormData,
): Promise<ActionResult<CreateUserFormWithConfirmation, InternalError | InvalidShapeError>> {
  await getSessionCached()

  const parentOuDn = formData.get('parentOuDn')?.toString() || ''
  const sAMAccountName = formData.get('sAMAccountName')?.toString() || ''
  const password = formData.get('password')?.toString() || ''
  const confirmPassword = formData.get('confirmPassword')?.toString() || ''
  const cn = formData.get('cn')?.toString() || ''

  const state = {parentOuDn,sAMAccountName,password,cn}

  if (password !== confirmPassword) {
    return errorActionResult(state, 'InvalidShape', 'As senhas não coincidem.')
  }

  const validation = CreateUserFormSchema.safeParse({
    cn,
    parentOuDn,
    sAMAccountName,
    password,
  })

  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(', ')
    return errorActionResult(state, 'InvalidShape', errorMsg)
  }

  const result = await userService.create(validation.data)

  if (!result.ok) {
    await auditService.log({
      action: 'user.create',
      actor: 'server-action',
      target: sAMAccountName,
      success: false,
      error: result.error.message,
    })
    return errorActionResult(state,'Internal', result.error.message)
  }

  await auditService.log({
    action: 'user.create',
    actor: 'server-action',
    target: sAMAccountName,
    details: { parentOuDn },
    success: true,
  })


  return { ok: true, state: validation.data }
}
