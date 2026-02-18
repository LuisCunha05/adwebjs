import {
  Attribute,
  Change,
  Client,
  EqualityFilter,
  Filter,
  OrFilter,
  ResultCodeError,
} from 'ldapts'
import {
  LDAP_BASE_DN as BASE_DN,
  LDAP_ADMIN_DN,
  LDAP_ADMIN_PASSWORD,
  LDAP_DEBUG,
  LDAP_DOMAIN,
  LDAP_GROUP_REQUIRED,
  LDAP_URL,
} from '../constants/config'
import {
  type ActiveDirectoryUser,
  ActiveDirectoryUserSchema,
  AdUserListSchema,
  CreateUserFormSchema,
  PasswordSchema,
  type UpdateUserInput,
  UpdateUserSchema,
} from '../schemas/attributesAd'
import type {
  CreateUserInput,
  DisableUserOptions,
  ILdapService,
  LdapUserAttributes,
  SearchUsersOptions,
} from '../types/ldap'
import { getFetchAttributes } from './ad-user-attributes'

const logDebug = (msg: string) => {
  if (LDAP_DEBUG) {
    console.log(`[${new Date().toISOString()}] ${msg}`)
  }
}

const logError = (msg: string, err: unknown) => {
  console.error(`[${new Date().toISOString()}] ${msg}`, err)
}

// Helper helpers
function escapeLdapFilter(val: string): string {
  return val
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\x00/g, '\\00')
}

function encodeUnicodePwd(password: string): Buffer {
  return Buffer.from(`"${password.replace(/"/g, '')}"`, 'utf16le')
}

function escapeRdn(val: string): string {
  return val
    .replace(/\\/g, '\\5C')
    .replace(/"/g, '\\22')
    .replace(/^(\s)|(\s)$/g, (_, a, _b) => (a ? '\\20' : '\\20'))
    .replace(/#/g, '\\23')
    .replace(/\+/g, '\\2B')
    .replace(/;/g, '\\3B')
    .replace(/</g, '\\3C')
    .replace(/=/g, '\\3D')
    .replace(/>/g, '\\3E')
    .replace(/,/g, '\\2C')
}

const UAC_ACCOUNTDISABLE = 2
const UAC_NORMAL = 512

function getSingleValue(
  val: string | string[] | Buffer | Buffer[] | undefined,
): string | undefined {
  if (val === undefined || val === null) return undefined
  if (Array.isArray(val)) {
    if (val.length === 0) return undefined
    const first = val[0]
    if (Buffer.isBuffer(first)) return first.toString()
    return String(first)
  }
  if (Buffer.isBuffer(val)) return val.toString()
  return String(val)
}

export class LdapService implements ILdapService {
  private createClient(): Client {
    return new Client({
      url: LDAP_URL,
      tlsOptions: { rejectUnauthorized: false },
    })
  }

  private async getAdminClient(): Promise<Client> {
    const client = this.createClient()
    if (!LDAP_ADMIN_DN || !LDAP_ADMIN_PASSWORD) {
      throw new Error('LDAP_ADMIN_DN or LDAP_ADMIN_PASSWORD not configured')
    }
    await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD)
    return client
  }

  async authenticate(username: string, password: string): Promise<ActiveDirectoryUser> {
    logDebug(`LDAP Debug - Authenticating user: ${username}`)

    // 1. Admin Bind to search for user DN\
    let adminClient: Client | undefined
    let userClient: Client | undefined
    try {
      adminClient = await this.getAdminClient()

      const filter = new OrFilter({
        filters: [
          new EqualityFilter({ attribute: 'sAMAccountName', value: username }),
          new EqualityFilter({ attribute: 'userPrincipalName', value: username }),
        ],
      })
      const result = await adminClient.search(BASE_DN, {
        filter,
        scope: 'sub',
        attributes: [
          'dn',
          'sAMAccountName',
          'userPrincipalName',
          'memberOf',
          'displayName',
          'cn',
          'mail',
          'objectClass',
        ],
      })

      if (result.searchEntries.length === 0) {
        throw new Error('User not found')
      }

      const userEntry = result.searchEntries[0]
      const userDn = userEntry.dn

      const parseUser = ActiveDirectoryUserSchema.safeParse(userEntry)

      if (!parseUser.success) {
        logDebug(`LDAP Debug - User ${username} has invalid shaped. ${parseUser.error.format()}`)
        console.log({ errors: parseUser.error })
        throw new Error('Invalid user shaped')
      }

      if (LDAP_GROUP_REQUIRED) {
        const groups = parseUser.data.memberOf ?? []
        const isMember = Array.isArray(groups)
          ? groups.some((g) => g === LDAP_GROUP_REQUIRED || String(g) === LDAP_GROUP_REQUIRED)
          : groups === LDAP_GROUP_REQUIRED

        if (!isMember) {
          logDebug(
            `LDAP Debug - User ${username} is NOT a member of required group: ${LDAP_GROUP_REQUIRED}`,
          )
          throw new Error('Unauthorized: Member of required group is missing')
        }
        logDebug(`LDAP Debug - User ${username} group check passed for: ${LDAP_GROUP_REQUIRED}`)
      }

      userClient = this.createClient()

      await userClient.bind(userDn, password)
      userClient.unbind()
      logDebug(`LDAP Debug - User authenticated successfully: ${username}`)

      return parseUser.data
    } catch (err: unknown) {
      if (err instanceof ResultCodeError) {
        if (err.message === 'Unauthorized') throw err
        logError('LDAP Debug - Authentication bind failed:', err)
        throw new Error('Invalid credentials')
      }

      logError('LDAP Search/Auth Error:', err)
      throw err
    } finally {
      try {
        userClient?.unbind()
        adminClient?.unbind()
      } catch {}
    }
  }

  async searchUsers(
    query: string,
    searchBy: string,
    options?: SearchUsersOptions,
  ): Promise<ActiveDirectoryUser[]> {
    const client = await this.getAdminClient()
    try {
      logDebug(`LDAP Debug - Searching users. Query: ${query}, By: ${searchBy}`)
      const parts: string[] = ['(objectClass=user)', '(objectCategory=person)']
      if (query.trim()) {
        parts.push(`(${searchBy}=*${escapeLdapFilter(query.trim())}*)`)
      } else {
        parts.push(`(${searchBy}=*)`)
      }
      if (options?.memberOf?.trim()) {
        parts.push(`(memberOf=${options.memberOf.trim()})`)
      }
      if (options?.disabledOnly) {
        parts.push('(userAccountControl:1.2.840.113556.1.4.803:=2)')
      }
      const searchFilter = `(&${parts.join('')})`
      const baseDn = options?.ou?.trim() || BASE_DN

      const result = await client.search(baseDn, {
        filter: searchFilter,
        scope: 'sub',
        attributes: [
          'dn',
          'sAMAccountName',
          'userPrincipalName',
          'cn',
          'mail',
          'memberOf',
          'userAccountControl',
          'pwdLastSet',
          'objectClass',
        ],
      })

      const entries = result.searchEntries || []
      // Validate entries against schema (partial)
      console.log({ entries })
      //
      const parsedEntries = AdUserListSchema.safeParse(entries)

      if (!parsedEntries.success) {
        console.log({ searchError: parsedEntries.error })
        throw new Error('Invalid shaped for returned list of users')
      }

      return parsedEntries.data
    } catch (err) {
      logError('LDAP Search Error:', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async getUser(id: string): Promise<ActiveDirectoryUser> {
    const client = await this.getAdminClient()
    try {
      logDebug(`LDAP Debug - Getting user details for: ${id}`)
      const result = await client.search(BASE_DN, {
        filter: `(sAMAccountName=${id})`,
        scope: 'sub',
        attributes: getFetchAttributes(),
      })

      if (result.searchEntries.length === 0) throw new Error('User not found')
      const user = result.searchEntries[0] as LdapUserAttributes

      const validation = ActiveDirectoryUserSchema.safeParse(user)
      if (!validation.success) {
        logError(`LDAP GetUser Validation Failed for ${id}:`, validation.error.format())
        throw new Error(`Invalid shaped for user id: ${id}`)
      }
      return validation.data
    } catch (err) {
      logError('LDAP GetUser Error:', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async createUser(input: CreateUserInput): Promise<ActiveDirectoryUser> {
    // Validate and transform input using CreateUserFormSchema
    const validation = CreateUserFormSchema.safeParse(input)
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      throw new Error(`Validation failed: ${issues}`)
    }

    const data = validation.data
    const { parentOuDn, sAMAccountName, password, cn } = data

    const rdn = `CN=${escapeRdn(cn)}`
    const dn = `${rdn},${parentOuDn.replace(/^\s+|\s+$/g, '')}`
    const domain = LDAP_DOMAIN
    const upn = data.userPrincipalName || `${sAMAccountName}@${domain}`

    const attrs: Array<{ type: string; values: (string | Buffer)[] }> = [
      {
        type: 'objectClass',
        values: ['top', 'person', 'organizationalPerson', 'user'],
      },
      { type: 'sAMAccountName', values: [sAMAccountName] },
      { type: 'userPrincipalName', values: [upn] },
      { type: 'cn', values: [cn] },
      { type: 'unicodePwd', values: [encodeUnicodePwd(password)] },
    ]

    for (const [k, v] of Object.entries(data)) {
      if (v) attrs.push({ type: k, values: [v] })
    }

    const client = await this.getAdminClient()
    try {
      const addAttrs = attrs.map(
        (a) =>
          new Attribute({
            type: a.type,
            values: a.values as string[] & Buffer[],
          }),
      )
      await client.add(dn, addAttrs)
      logDebug(`LDAP Debug - User created: ${sAMAccountName}`)
      return this.getUser(sAMAccountName)
    } catch (err) {
      logError('LDAP CreateUser Error', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUser(id)
    const dn = getSingleValue(user.dn)
    if (!dn) throw new Error('User has no DN')

    const client = await this.getAdminClient()
    try {
      await client.del(dn)
      logDebug(`LDAP Debug - User deleted: ${id}`)
    } finally {
      client.unbind()
    }
  }

  async setPassword(id: string, newPassword: string): Promise<void> {
    // Validate password using PasswordSchema
    const validation = PasswordSchema.safeParse(newPassword)
    if (!validation.success) {
      throw new Error(`Invalid password: ${validation.error.issues[0].message}`)
    }

    if (!newPassword || newPassword.length < 1) throw new Error('Nova senha é obrigatória')

    const user = await this.getUser(id)
    const dn = getSingleValue(user.dn)
    if (!dn) throw new Error('User has no DN')

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
      logDebug(`LDAP Debug - Password set for: ${id}`)
    } finally {
      client.unbind()
    }
  }

  async updateUser(id: string, changes: UpdateUserInput): Promise<ActiveDirectoryUser> {
    logDebug(`LDAP Debug - Updating user: ${id}`)

    // Validate changes against schema
    const validation = UpdateUserSchema.safeParse(changes)
    console.log({ changes })
    if (!validation.success) {
      // Filter out invalid keys or throw?
      // For update, usually we want to block invalid updates.
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      throw new Error(`Update validation failed: ${issues}`)
    }

    const user = await this.getUser(id)
    const dn = user.dn

    const client = await this.getAdminClient()
    try {
      const modifications: Change[] = []
      logDebug(`LDAP Debug - UpdateUser Changes: ${JSON.stringify(changes)}`)

      for (const [key, value] of Object.entries(validation.data)) {
        if (
          key === 'dn' ||
          key === 'sAMAccountName' ||
          key === 'memberOf' ||
          key === 'unicodePwd' ||
          key === 'objectClass'
        )
          continue

        const newValue = value
        const currentValue = user[key as keyof ActiveDirectoryUser]

        let values: string[] = []
        let op: 'add' | 'delete' | 'replace' = 'replace'

        if (newValue === '' || newValue === null || newValue === undefined) {
          if (!currentValue) continue
          if (key === 'userAccountControl') continue
          op = 'delete'
          values = []
        } else {
          const processedValue = newValue
          values = Array.isArray(processedValue)
            ? processedValue.map(String)
            : [String(processedValue)]
          const curVals = Array.isArray(currentValue)
            ? currentValue.map(String)
            : currentValue
              ? [String(currentValue)]
              : []
          if (JSON.stringify([...values].sort()) === JSON.stringify([...curVals].sort())) continue
        }

        modifications.push(
          new Change({
            operation: op,
            modification: new Attribute({
              type: key,
              values: values,
            }),
          }),
        )
      }

      if (modifications.length === 0) {
        logDebug(`LDAP Debug - No changes detected for user: ${id}`)
        return user
      }

      await client.modify(dn, modifications)
      logDebug(`LDAP Debug - User updated successfully: ${id}`)
      return { ...user, ...changes } as ActiveDirectoryUser
    } catch (err) {
      logError('LDAP Update Error', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async searchGroups(query: string): Promise<Record<string, unknown>[]> {
    const client = await this.getAdminClient()
    try {
      logDebug(`LDAP Debug - Searching groups: ${query}`)
      const result = await client.search(BASE_DN, {
        filter: `(&(cn=*${query}*)(objectClass=group))`,
        scope: 'sub',
        attributes: ['dn', 'cn', 'description', 'member'],
      })
      return result.searchEntries
    } catch (err) {
      logError('LDAP Group Search Error', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async getGroup(id: string): Promise<any> {
    const client = await this.getAdminClient()
    try {
      logDebug(`LDAP Debug - Getting group details: ${id}`)
      const result = await client.search(BASE_DN, {
        filter: `(&(cn=${id})(objectClass=group))`,
        scope: 'sub',
        attributes: ['dn', 'cn', 'description', 'member'],
      })
      if (result.searchEntries.length === 0) throw new Error('Group not found')
      return result.searchEntries[0]
    } catch (err) {
      logError('LDAP GetGroup Error', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async updateGroup(id: string, changes: any): Promise<any> {
    logDebug(`LDAP Debug - Updating group: ${id}`)
    const group = await this.getGroup(id)
    const dn = group.dn

    const client = await this.getAdminClient()
    try {
      const modifications: Change[] = []
      logDebug(`LDAP Debug - UpdateGroup Changes: ${JSON.stringify(changes)}`)

      for (const [key, value] of Object.entries(changes)) {
        if (key === 'dn' || key === 'cn') continue

        const newValue = value
        const currentValue = group[key]

        let values: string[] = []
        let op: 'add' | 'delete' | 'replace' = 'replace'

        if (
          newValue === '' ||
          newValue === null ||
          newValue === undefined ||
          (Array.isArray(newValue) && newValue.length === 0)
        ) {
          if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) continue
          op = 'delete'
          values = []
        } else {
          const rawValues = Array.isArray(newValue) ? newValue.map(String) : [String(newValue)]
          values = [...new Set(rawValues)] // Deduplicate

          const curVals = Array.isArray(currentValue)
            ? currentValue.map(String)
            : currentValue
              ? [String(currentValue)]
              : []
          if (JSON.stringify(values.sort()) === JSON.stringify(curVals.sort())) continue
        }

        modifications.push(
          new Change({
            operation: op,
            modification: new Attribute({
              type: key,
              values: values,
            }),
          }),
        )
      }

      if (modifications.length === 0) {
        logDebug(`LDAP Debug - No changes detected for group: ${id}`)
        return group
      }

      await client.modify(dn, modifications)
      logDebug(`LDAP Debug - Group updated successfully: ${id}`)
      return { ...group, ...changes }
    } catch (err) {
      logError('LDAP Group Update Error', err)
      throw err
    } finally {
      client.unbind()
    }
  }

  async moveUserToOu(id: string, targetOuDn: string): Promise<void> {
    const user = await this.getUser(id)
    const rawDn = getSingleValue(user.dn)
    const dn = (rawDn || '').trim()
    if (!dn) throw new Error('User has no DN')

    const rdn = dn.split(',')[0]
    if (!rdn) throw new Error('Invalid user DN')

    const newDn = `${rdn},${targetOuDn.replace(/^\s+|\s+$/g, '')}`
    const client = await this.getAdminClient()
    try {
      await client.modifyDN(dn, newDn)
      logDebug(`LDAP Debug - User moved: ${id} -> ${newDn}`)
    } finally {
      client.unbind()
    }
  }

  async disableUser(id: string, options?: DisableUserOptions): Promise<void> {
    if (options?.targetOu?.trim()) {
      await this.moveUserToOu(id, options.targetOu.trim())
    }
    const user = await this.getUser(id)
    const current = Number(user.userAccountControl) || UAC_NORMAL
    await this.updateUser(id, {
      userAccountControl: String(current | UAC_ACCOUNTDISABLE),
    })
  }

  async enableUser(id: string): Promise<void> {
    const user = await this.getUser(id)
    const current = Number(user.userAccountControl) || UAC_NORMAL
    await this.updateUser(id, {
      userAccountControl: String(current & ~UAC_ACCOUNTDISABLE),
    })
  }

  async unlockUser(id: string): Promise<void> {
    const user = await this.getUser(id)
    const dn = getSingleValue(user.dn)
    if (!dn) throw new Error('User has no DN')

    const client = await this.getAdminClient()
    try {
      await client.modify(dn, [
        new Change({
          operation: 'replace',
          modification: new Attribute({ type: 'lockoutTime', values: ['0'] }),
        }),
      ])
      logDebug(`LDAP Debug - User unlocked: ${id}`)
    } finally {
      client.unbind()
    }
  }

  async listOUs(): Promise<any[]> {
    try {
      const client = await this.getAdminClient()
      try {
        const result = await client.search(BASE_DN, {
          filter: '(objectClass=organizationalUnit)',
          scope: 'sub',
          attributes: ['dn', 'ou', 'name', 'description'],
        })
        return result.searchEntries || []
      } finally {
        client.unbind()
      }
    } catch (err) {
      logError('LDAP List OUs Error', err)
      return []
    }
  }

  async addMemberToGroup(groupCn: string, memberDn: string): Promise<void> {
    const group = await this.getGroup(groupCn)
    const client = await this.getAdminClient()
    try {
      const current = Array.isArray(group.member)
        ? group.member
        : group.member
          ? [group.member]
          : []
      if (current.map((m: string) => m.toLowerCase()).includes(memberDn.toLowerCase())) {
        logDebug(`LDAP Debug - Member already in group: ${memberDn}`)
        return
      }
      await client.modify(group.dn, [
        new Change({
          operation: 'add',
          modification: new Attribute({ type: 'member', values: [memberDn] }),
        }),
      ])
      logDebug(`LDAP Debug - Added member to group ${groupCn}: ${memberDn}`)
    } finally {
      client.unbind()
    }
  }

  async removeMemberFromGroup(groupCn: string, memberDn: string): Promise<void> {
    const group = await this.getGroup(groupCn)
    const client = await this.getAdminClient()
    try {
      await client.modify(group.dn, [
        new Change({
          operation: 'delete',
          modification: new Attribute({ type: 'member', values: [memberDn] }),
        }),
      ])
      logDebug(`LDAP Debug - Removed member from group ${groupCn}: ${memberDn}`)
    } finally {
      client.unbind()
    }
  }

  async resolveMemberDns(
    dns: string[],
  ): Promise<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]> {
    if (!dns || dns.length === 0) return []
    const client = await this.getAdminClient()
    const out: {
      dn: string
      displayName?: string
      cn?: string
      sAMAccountName?: string
    }[] = []
    try {
      for (const dn of dns) {
        try {
          const res = await client.search(dn, {
            scope: 'base',
            attributes: ['dn', 'cn', 'sAMAccountName', 'displayName'],
          })
          if (res.searchEntries.length > 0) {
            const e = res.searchEntries[0]
            out.push({
              dn: e.dn || dn,
              displayName: getSingleValue(e.displayName) ?? getSingleValue(e.cn),
              cn: getSingleValue(e.cn),
              sAMAccountName: getSingleValue(e.sAMAccountName),
            })
          } else {
            out.push({ dn })
          }
        } catch {
          out.push({ dn })
        }
      }
      return out
    } finally {
      client.unbind()
    }
  }

  async getStats(): Promise<{
    usersCount: number
    disabledCount: number
    groupsCount: number
  }> {
    let usersCount = 0
    let disabledCount = 0
    let groupsCount = 0
    try {
      const client = await this.getAdminClient()
      try {
        try {
          const usersRes = await client.search(BASE_DN, {
            filter: '(&(objectClass=user)(objectCategory=person))',
            scope: 'sub',
            attributes: ['dn'],
            sizeLimit: 10000,
          })
          usersCount = (usersRes.searchEntries || []).length
        } catch (e) {
          logError('LDAP GetStats users', e)
        }
        try {
          const disabledRes = await client.search(BASE_DN, {
            filter:
              '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=2))',
            scope: 'sub',
            attributes: ['dn'],
            sizeLimit: 10000,
          })
          disabledCount = (disabledRes.searchEntries || []).length
        } catch (e) {
          logError('LDAP GetStats disabled', e)
        }
        try {
          const groupsRes = await client.search(BASE_DN, {
            filter: '(objectClass=group)',
            scope: 'sub',
            attributes: ['dn'],
            sizeLimit: 10000,
          })
          groupsCount = (groupsRes.searchEntries || []).length
        } catch (e) {
          logError('LDAP GetStats groups', e)
        }
      } finally {
        client.unbind()
      }
    } catch (err) {
      logError('LDAP GetStats Error', err)
    }
    return { usersCount, disabledCount, groupsCount }
  }
}
