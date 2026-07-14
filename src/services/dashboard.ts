import { AndFilter, EqualityFilter } from 'ldapts'
import { LDAP_BASE_DN } from '@/constants/config'
import type { IDashboard } from '@/types/dashboard'
import type { ILogger } from '@/types/logger'
import { errorResult } from '@/utils/error'
import { BaseLdapService } from './ldap'

export class DashboardService extends BaseLdapService implements IDashboard {
  #logger: ILogger

  constructor(logger: ILogger) {
    super()
    this.#logger = logger
  }

  async get() {
    const client = await this.getAdminClient()
    try {
      const filter = new AndFilter({
        filters: [
          new EqualityFilter({ attribute: 'objectClass', value: 'user' }),
          new EqualityFilter({ attribute: 'objectCategory', value: 'person' }),
        ],
      })
      const usersRes = await client.search(LDAP_BASE_DN, {
        filter,
        scope: 'sub',
        sizeLimit: 10000,
      })
      const usersCount = usersRes.searchEntries.length

      const disabledFilter = new AndFilter({
        filters: [
          new EqualityFilter({ attribute: 'objectClass', value: 'user' }),
          new EqualityFilter({ attribute: 'objectCategory', value: 'person' }),
          new EqualityFilter({
            attribute: 'userAccountControl:1.2.840.113556.1.4.803:',
            value: '2',
          }),
        ],
      })
      const disabledRes = await client.search(LDAP_BASE_DN, {
        filter: disabledFilter,
        scope: 'sub',
        sizeLimit: 10000,
      })
      const disabledCount = disabledRes.searchEntries.length

      const groupFilter = new EqualityFilter({ attribute: 'objectClass', value: 'group' })
      const groupsRes = await client.search(LDAP_BASE_DN, {
        filter: groupFilter,
        scope: 'sub',
        sizeLimit: 10000,
      })
      const groupsCount = groupsRes.searchEntries.length

      return { ok: true, value: { usersCount, disabledCount, groupsCount } } as const
    } catch (err) {
      this.#logger.error('LDAP GetStats Error', err)
      return errorResult('Internal', err instanceof Error ? err.message : String(err))
    } finally {
      client.unbind()
    }
  }
}
