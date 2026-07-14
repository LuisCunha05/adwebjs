import { Attribute, Change, EqualityFilter, OrFilter } from 'ldapts'
import z from 'zod'
import { LDAP_BASE_DN, LDAP_GROUP_REQUIRED } from '@/constants/config'
import { ADMIN_SEARCH_USER_ATTRIBUTES } from '@/constants/ldap'
import {
  ActiveDirectoryUserSchema,
  ldapResponseSchema,
  PasswordSchema,
} from '@/schemas/attributesAd'
import type { IAuthService } from '@/types/auth'
import type { ILogger } from '@/types/logger'
import { errorResult } from '@/utils/error'
import { BaseLdapService } from './ldap'

function encodeUnicodePwd(password: string): Buffer {
  return Buffer.from(`"${password.replace(/"/g, '')}"`, 'utf16le')
}

const UAC_ACCOUNTDISABLE = 2
const UAC_NORMAL = 512

const authSchema = z.object({ dn: z.string(), userAccountControl: z.string() })

export class AuthService extends BaseLdapService implements IAuthService {
  #logger: ILogger
  constructor(logger: ILogger) {
    super()
    this.#logger = logger
  }

  async getUser(id: string) {
    const client = await this.getAdminClient()

    this.#logger.debug(`Getting user details for: ${id}`)
    const filter = new EqualityFilter({ attribute: 'sAMAccountName', value: id })

    const result = await client.search(LDAP_BASE_DN, {
      filter,
      scope: 'sub',
      attributes: ['userAccountControl'],
    })

    if (result.searchEntries.length === 0) {
      this.#logger.error('User not found', id)
      return errorResult('NotFound', 'User nof found')
    }

    const parsedUser = authSchema.safeParse(result.searchEntries[0])

    if (!parsedUser.success) {
      this.#logger.error('Error while parsing user object', id)
      return errorResult('Parse', 'Error while parsing user object')
    }

    return { ok: true, value: parsedUser.data } as const
  }

  async authenticate(username: string, password: string) {
    this.#logger.debug(`LDAP Debug - Authenticating user: ${username}`)

    const adminClient = await this.getAdminClient()

    const filter = new OrFilter({
      filters: [
        new EqualityFilter({ attribute: 'sAMAccountName', value: username }),
        new EqualityFilter({ attribute: 'userPrincipalName', value: username }),
      ],
    })
    const result = await adminClient.search(LDAP_BASE_DN, {
      filter,
      scope: 'sub',
      attributes: ADMIN_SEARCH_USER_ATTRIBUTES as unknown as string[],
    })

    if (result.searchEntries.length === 0) {
      return errorResult('NotFound', 'User not found')
    }

    const userEntry = result.searchEntries[0]
    const userDn = userEntry.dn

    const ldapResponseToUser = ldapResponseSchema.pipe(ActiveDirectoryUserSchema)
    const parseUser = ldapResponseToUser.safeParse(userEntry)

    if (!parseUser.success) {
      this.#logger.error(
        `LDAP Debug - User ${username} has invalid shaped. ${parseUser.error.format()}`,
      )
      return errorResult('Internal', 'Invalid user shaped')
    }

    if (LDAP_GROUP_REQUIRED) {
      const groups = parseUser.data.memberOf ?? []
      const isMember = Array.isArray(groups)
        ? groups.some((g) => g === LDAP_GROUP_REQUIRED || String(g) === LDAP_GROUP_REQUIRED)
        : groups === LDAP_GROUP_REQUIRED

      if (!isMember) {
        this.#logger.debug(
          `LDAP Debug - User ${username} is NOT a member of required group: ${LDAP_GROUP_REQUIRED}`,
        )
        return errorResult('Internal', 'Unauthorized: Member of required group is missing')
      }
      this.#logger.debug(
        `LDAP Debug - User ${username} group check passed for: ${LDAP_GROUP_REQUIRED}`,
      )
    }

    const isValidLogin = await this.getUserClient(userDn, password)

    if (!isValidLogin.ok) {
      this.#logger.error('Authentication bind failed:', userDn)
      return errorResult('Unauthorized', 'Invalid credentials')
    }
    this.#logger.debug(`User authenticated successfully: ${username}`)
    adminClient.unbind()

    return { ok: true, value: parseUser.data } as const
  }

  async deleteUser(id: string) {
    const userResult = await this.getUser(id)
    if (!userResult.ok) return userResult
    const { dn } = userResult.value

    const client = await this.getAdminClient()

    try {
      await client.del(dn)
      this.#logger.debug(`User deleted: ${id}`)
      return { ok: true, value: null } as const
    } catch (error: unknown) {
      return errorResult(
        'Internal',
        error instanceof Error ? error.message : 'internal error on delete',
      )
    } finally {
      client.unbind()
    }
  }

  async setPassword(id: string, newPassword: string) {
    const validation = PasswordSchema.safeParse(newPassword)
    if (!validation.success) {
      return errorResult('Parse', `Invalid password: ${validation.error.issues[0].message}`)
    }

    const userResult = await this.getUser(id)
    if (!userResult.ok) return userResult
    const { dn } = userResult.value

    const client = await this.getAdminClient()

    try {
      await client.modify(dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({
            type: 'unicodePwd',
            values: [encodeUnicodePwd(newPassword)],
          }),
        }),
      ])
      this.#logger.debug(`Password set for: ${id}`)
      return { ok: true, value: null } as const
    } catch {
      return errorResult('Internal', 'Error while changing user password')
    } finally {
      client.unbind()
    }
  }

  async disableUser(id: string, targetOu?: string) {
    const client = await this.getAdminClient()

    const userResult = await this.getUser(id)
    if (!userResult.ok) return userResult
    const user = userResult.value
    const current = Number(user.userAccountControl)
    const disabledUser = String(current | UAC_ACCOUNTDISABLE)

    try {
      await client.modify(user.dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({
            type: 'userAccountControl',
            values: [disabledUser],
          }),
        }),
      ])

      if (targetOu) {
        const rdn = user.dn.split(',')[0]
        const newDn = `${rdn},${targetOu.trim()}`

        await client.modifyDN(user.dn, rdn)
        this.#logger.debug(`User moved: ${id} -> ${newDn}`)
      }

      return { ok: true, value: null } as const
    } catch (err) {
      this.#logger.error(err instanceof Error ? err.message : String(err))
      return errorResult('Internal', 'Error while disabling user')
    } finally {
      client.unbind()
    }
  }

  async enableUser(id: string) {
    const userResult = await this.getUser(id)
    if (!userResult.ok) return userResult
    const user = userResult.value

    const client = await this.getAdminClient()

    const current = Number(user.userAccountControl) || UAC_NORMAL
    const disabledUser = String(current & ~UAC_ACCOUNTDISABLE)
    try {
      await client.modify(user.dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({
            type: 'userAccountControl',
            values: [disabledUser],
          }),
        }),
      ])
      return { ok: true, value: null } as const
    } catch (err) {
      this.#logger.error(err instanceof Error ? err.message : String(err))
      return errorResult('Internal', 'Error while enabling user')
    } finally {
      client.unbind()
    }
  }

  async unlockUser(id: string) {
    const userResult = await this.getUser(id)
    if (!userResult.ok) return userResult
    const { dn } = userResult.value

    const client = await this.getAdminClient()

    try {
      await client.modify(dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({ type: 'lockoutTime', values: ['0'] }),
        }),
      ])
      this.#logger.debug(`User unlocked: ${id}`)
      return { ok: true, value: null } as const
    } catch {
      return errorResult('Internal', 'Error while unlocking user')
    } finally {
      client.unbind()
    }
  }
}
