import {
  AndFilter,
  Attribute,
  Change,
  EqualityFilter,
  type Filter,
  PresenceFilter,
  SubstringFilter,
} from 'ldapts'
import { LDAP_BASE_DN, LDAP_DOMAIN } from '@/constants/config'
import { SEARCH_USERS_ATTRIBUTES, USER_OBJECT_CLASSES } from '@/constants/ldap'
import {
  type ActiveDirectoryUser,
  ActiveDirectoryUserSchema,
  AdUserListSchema,
  CreateUserFormSchema,
  type UpdateUserInput,
  UpdateUserSchema,
} from '@/schemas/attributesAd'
import type { ILogger } from '@/types/logger'
import type { CreateUserInput, IUserService, SearchUsersOptions } from '@/types/user'
import { errorResult } from '@/utils/error'
import { encodeUnicodePwd, escapeDN } from '@/utils/escape'
import { getFetchAttributes } from './ad-user-attributes'
import { BaseLdapService } from './ldap'

export class UserService extends BaseLdapService implements IUserService {
  #logger: ILogger
  constructor(logger: ILogger) {
    super()
    this.#logger = logger
  }

  async search(query: string, searchBy: string, options?: SearchUsersOptions) {
    const client = await this.getAdminClient()

    try {
      this.#logger.debug(` Searching users. Query: ${query}, By: ${searchBy}`)
      const filters: Filter[] = [
        new EqualityFilter({ attribute: 'objectClass', value: 'user' }),
        new EqualityFilter({ attribute: 'objectCategory', value: 'person' }),
      ]

      if (query.trim()) {
        filters.push(
          new SubstringFilter({
            attribute: searchBy,
            initial: '',
            any: [query.trim()],
            final: '',
          }),
        )
      } else {
        filters.push(new PresenceFilter({ attribute: searchBy }))
      }

      if (options?.memberOf?.trim()) {
        filters.push(new EqualityFilter({ attribute: 'memberOf', value: options.memberOf.trim() }))
      }
      if (options?.disabledOnly) {
        filters.push(
          new EqualityFilter({
            attribute: 'userAccountControl:1.2.840.113556.1.4.803:',
            value: '2',
          }),
        )
      }
      const searchFilter = new AndFilter({ filters })
      const baseDn = options?.ou?.trim() || LDAP_BASE_DN

      const result = await client.search(baseDn, {
        filter: searchFilter,
        scope: 'sub',
        attributes: SEARCH_USERS_ATTRIBUTES as unknown as string[],
        paged: true,
      })

      const parsedEntries = AdUserListSchema.safeParse(result.searchEntries)

      if (!parsedEntries.success) {
        this.#logger.error('error while parsing', parsedEntries.error.format())
        return errorResult('Internal', 'invalid shape')
      }

      const allUsers = parsedEntries.data
      const total = allUsers.length
      const page = options?.page || 1
      const pageSize = options?.pageSize || 10
      const totalPages = Math.ceil(total / pageSize)
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const data = allUsers.slice(start, end)

      return {
        ok: true,
        value: {
          data,
          total,
          page,
          pageSize,
          totalPages,
        },
      } as const
    } catch (err) {
      this.#logger.error('LDAP Search Error:', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async get(id: string) {
    const client = await this.getAdminClient()
    this.#logger.debug(`Getting user details for: ${id}`)

    try {
      const filter = new EqualityFilter({ attribute: 'sAMAccountName', value: id })
      const result = await client.search(LDAP_BASE_DN, {
        filter,
        scope: 'sub',
        attributes: getFetchAttributes(),
      })

      if (!result.searchEntries.length) return errorResult('NotFound', 'User not found')

      const validation = ActiveDirectoryUserSchema.safeParse(result.searchEntries[0])

      if (!validation.success) {
        this.#logger.error(`GetUser Validation Failed for ${id}:`, validation.error.format())
        return errorResult('Parse', `Invalid shaped for user id: ${id}`)
      }

      return { ok: true, value: validation.data } as const
    } catch (err) {
      this.#logger.error('GetUser Error:', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async create(input: CreateUserInput) {
    const parsedData = CreateUserFormSchema.safeParse(input)
    if (!parsedData.success) {
      const issues = parsedData.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      return errorResult('Internal', `Validation failed: ${issues}`)
    }

    const data = parsedData.data
    const { parentOuDn, sAMAccountName, password, cn } = data

    const rdn = `CN=${escapeDN(cn)}`
    const dn = `${rdn},${parentOuDn.trim()}`
    const domain = LDAP_DOMAIN
    const upn = data.userPrincipalName || `${sAMAccountName}@${domain}`

    const attrs: Array<{ type: string; values: (string | Buffer)[] }> = [
      {
        type: 'objectClass',
        values: [...USER_OBJECT_CLASSES],
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
      this.#logger.debug(`LDAP Debug - User created: ${sAMAccountName}`)

      const createdUser = await this.get(sAMAccountName)

      if (!createdUser.ok) return errorResult('Internal', 'Error while getting new created user')

      return { ok: true, value: createdUser.value } as const
    } catch (err) {
      this.#logger.error('LDAP CreateUser Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async update(id: string, changes: UpdateUserInput) {
    this.#logger.debug(`LDAP Debug - Updating user: ${id}`)

    const validation = UpdateUserSchema.safeParse(changes)

    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      return errorResult('Internal', `Update validation failed: ${issues}`)
    }

    const userResult = await this.get(id)
    if (!userResult.ok) return errorResult('Internal', 'invalid shaper for user while updating')
    const user = userResult.value
    const dn = user.dn

    const client = await this.getAdminClient()

    try {
      const modifications: Change[] = []
      this.#logger.debug(`LDAP Debug - UpdateUser Changes: ${JSON.stringify(changes)}`)

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
        this.#logger.debug(`LDAP Debug - No changes detected for user: ${id}`)
        return { ok: true, value: user } as const
      }

      await client.modify(dn, modifications)
      this.#logger.debug(`LDAP Debug - User updated successfully: ${id}`)

      const updatedUser = await this.get(dn)

      if (!updatedUser.ok) return errorResult('Internal', 'error while getting updated user')
      return { ok: true, value: updatedUser.value } as const
    } catch (err) {
      this.#logger.error('LDAP Update Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async moveOu(id: string, targetOuDn: string) {
    const userResult = await this.get(id)
    if (!userResult.ok) return errorResult('NotFound', `could not find user: ${id}`)

    const user = userResult.value
    const { dn } = user

    const rdn = dn.split(',')[0]
    if (!rdn) return errorResult('Internal', 'Invalid user DN')

    const newDn = `${rdn},${targetOuDn.trim()}`

    const client = await this.getAdminClient()

    try {
      await client.modifyDN(dn, newDn)
      this.#logger.info(`User moved: ${id} -> ${newDn}`)
      return { ok: true, value: null } as const
    } catch (err) {
      this.#logger.error('LDAP Update Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }
}
