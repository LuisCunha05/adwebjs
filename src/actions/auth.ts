'use server'

import { redirect } from 'next/navigation'
import { LDAP_GROUP_DELETE } from '@/constants/config'
import { loginSchema } from '@/schemas/login'
import { authService } from '@/services/container'
import { logger } from '@/services/logger'
import type { Session } from '@/types/session'
import { createSession, deleteSession } from '@/utils/manage-jwt'

function getVal(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined
  return String(v)
}

export interface LoginState {
  username: string
  error?: string
}

export async function loginAction(state: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const parsedData = loginSchema.safeParse({
      username: formData.get('username'),
      password: formData.get('password'),
    })

    if (!parsedData.success) {
      return {
        error: 'Insira um nome de usuário(ou email) e senha',
        username: state.username,
      }
    }

    const userRes = await authService.authenticate(
      parsedData.data.username,
      parsedData.data.password,
    )

    if (!userRes.ok)
      return {
        username: formData.get('username')?.toString() ?? '',
        error: 'Credenciais inválidas',
      }

    const user = userRes.value
    const canDelete =
      Array.isArray(user.memberOf) &&
      !!LDAP_GROUP_DELETE &&
      user.memberOf.includes(LDAP_GROUP_DELETE)

    const session: Session = {
      user: {
        sAMAccountName: user.sAMAccountName,
        cn: user.cn,
        mail: getVal(user.mail),
        userPrincipalName: getVal(user.userPrincipalName),
        displayName: user.displayName,
      },
      isAdmin: true,
      canDelete,
    }

    await createSession(session)
  } catch (err: unknown) {
    logger.error('Error while creating seassion', err)
    return {
      username: formData.get('username')?.toString() ?? '',
      error: 'Credenciais inválidas ou erro de conexão',
    }
  }

  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
