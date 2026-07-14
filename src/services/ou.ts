import { EqualityFilter } from 'ldapts'
import { LDAP_BASE_DN } from '@/constants/config'
import { OU_SEARCH_ATTRIBUTES } from '@/constants/ldap'
import { OuSchema } from '@/schemas/attributesAd'
import type { ILogger } from '@/types/logger'
import type { IOuService } from '@/types/ou'
import { errorResult } from '@/utils/error'
import { BaseLdapService } from './ldap'

export class OuService extends BaseLdapService implements IOuService {
  #logger: ILogger
  constructor(logger: ILogger) {
    super()
    this.#logger = logger
  }

  async listOUs() {
    const client = await this.getAdminClient()

    const filter = new EqualityFilter({ attribute: 'objectClass', value: 'organizationalUnit' })
    const search = await client.search(LDAP_BASE_DN, {
      filter,
      scope: 'sub',
      attributes: OU_SEARCH_ATTRIBUTES as unknown as string[],
    })

    const parsedOus = OuSchema.array().safeParse(search.searchEntries)

    if (!parsedOus.success) {
      this.#logger.error('Invalid shape for OUs', parsedOus.error.format())
      return errorResult('Parse', "Parsing error: OU list didn't match expected shaped")
    }

    client.unbind()
    return { ok: true, value: parsedOus.data } as const
  }
}
