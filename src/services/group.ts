import { AndFilter, Attribute, Change, EqualityFilter, SubstringFilter } from 'ldapts'
import { LDAP_BASE_DN } from '@/constants/config'
import { GROUP_SEARCH_ATTRIBUTES } from '@/constants/ldap'
import { GroupSchema } from '@/schemas/attributesAd'
import type { IGroupService, IGroupUpdate } from '@/types/group'
import type { ILogger } from '@/types/logger'
import { errorResult } from '@/utils/error'
import { BaseLdapService } from './ldap'

export class GroupService extends BaseLdapService implements IGroupService {
  #logger: ILogger
  constructor(logger: ILogger) {
    super()
    this.#logger = logger
  }

  async search(query: string) {
    const client = await this.getAdminClient()

    try {
      this.#logger.debug(`LDAP Debug - Searching groups: ${query}`)
      const filter = new AndFilter({
        filters: [
          new SubstringFilter({ attribute: 'cn', initial: '', any: [query], final: '' }),
          new EqualityFilter({ attribute: 'objectClass', value: 'group' }),
        ],
      })
      const result = await client.search(LDAP_BASE_DN, {
        filter,
        scope: 'sub',
        attributes: GROUP_SEARCH_ATTRIBUTES as unknown as string[],
      })

      const parsedData = GroupSchema.array().safeParse(result.searchEntries)

      if (!parsedData.success) {
        return errorResult('Parse', 'Parsing error for groups')
      }

      return { ok: true, value: parsedData.data } as const
    } catch (err) {
      this.#logger.error('LDAP Group Search Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async get(id: string) {
    const client = await this.getAdminClient()

    try {
      this.#logger.debug(`Getting group details: ${id}`)
      const filter = new AndFilter({
        filters: [
          new EqualityFilter({ attribute: 'cn', value: id }),
          new EqualityFilter({ attribute: 'objectClass', value: 'group' }),
        ],
      })

      const result = await client.search(LDAP_BASE_DN, {
        filter,
        scope: 'sub',
        attributes: GROUP_SEARCH_ATTRIBUTES as unknown as string[],
      })

      if (!result.searchEntries.length) return errorResult('NotFound', 'Group not found')

      const parsedData = GroupSchema.safeParse(result.searchEntries[0])

      if (!parsedData.success) return errorResult('Parse', 'Parsing error for group')

      return { ok: true, value: parsedData.data } as const
    } catch (err) {
      this.#logger.error('LDAP GetGroup Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async update(id: string, changes: IGroupUpdate) {
    this.#logger.debug(`Updating group: ${id}`)
    const groupResult = await this.get(id)
    if (!groupResult.ok) return errorResult('Internal', `Error getting ${id}`)
    const group = groupResult.value

    const client = await this.getAdminClient()

    const modifications: Change[] = []
    try {
      this.#logger.debug(` UpdateGroup Changes: ${JSON.stringify(changes)}`)

      const description = changes.description?.trim()
      const members = changes.member?.filter((item) => item && !!item.trim())

      if (description)
        modifications.push(
          new Change({
            operation: 'replace',
            modification: new Attribute({
              type: 'description',
              values: [description],
            }),
          }),
        )

      if (members?.length)
        modifications.push(
          new Change({
            operation: 'replace',
            modification: new Attribute({
              type: 'member',
              values: members,
            }),
          }),
        )

      if (!modifications.length) {
        this.#logger.info(`No changes detected for group: ${id}`)
        return { ok: true, value: 0 } as const
      }

      await client.modify(group.dn, modifications)
      this.#logger.info(`Group updated successfully: ${id}`)
      return { ok: true, value: modifications.length } as const
    } catch (err) {
      this.#logger.error('Group Update Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async addMember(groupCn: string, memberDn: string) {
    const groupResult = await this.get(groupCn)
    if (!groupResult.ok) return errorResult('Internal', `Error while getting group: ${groupCn}`)
    const group = groupResult.value
    const client = await this.getAdminClient()

    try {
      const current = group.member
      if (current.find((item) => item.toLowerCase() === memberDn.toLowerCase())) {
        this.#logger.debug(`Member already in group: ${memberDn}`)
        return errorResult('Internal', 'User already in group')
      }

      await client.modify(group.dn, [
        new Change({
          operation: 'add',
          modification: new Attribute({ type: 'member', values: [memberDn] }),
        }),
      ])

      this.#logger.info(`Added member to group ${groupCn}: ${memberDn}`)
      return { ok: true, value: null } as const
    } catch (err) {
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }

  async removeMember(groupCn: string, memberDn: string) {
    const groupResult = await this.get(groupCn)
    if (!groupResult.ok) return errorResult('Internal', `Error while getting group ${groupCn}`)
    const group = groupResult.value
    const client = await this.getAdminClient()

    try {
      await client.modify(group.dn, [
        new Change({
          operation: 'delete',
          modification: new Attribute({ type: 'member', values: [memberDn] }),
        }),
      ])

      this.#logger.info(`Removed member from group ${groupCn}: ${memberDn}`)
      return { ok: true, value: null } as const
    } catch (err) {
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }
}
