import { Client } from 'ldapts'
import { errorResult } from '@/utils/error'
import { LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, LDAP_URL } from '../constants/config'
import type { ILdapService } from '../types/ldap'

export class BaseLdapService implements ILdapService {
  getClient() {
    return new Client({
      url: LDAP_URL,
      tlsOptions: { rejectUnauthorized: false },
    })
  }
  async getAdminClient() {
    const client = this.getClient()
    await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD)
    return client
  }

  async getUserClient(userDn: string, password: string) {
    const client = this.getClient()

    try {
      await client.bind(userDn, password)
      await client.unbind()
      return { ok: true, value: null } as const
    } catch {
      return errorResult('Unauthorized', 'Invalid user credentials')
    }
  }
}

// export class LdapService implements ILdapService {
//   private createClient(): Client {
//     return new Client({
//       url: LDAP_URL,
//       tlsOptions: { rejectUnauthorized: false },
//     })
//   }

//   private async getAdminClient() {
//     const client = this.createClient()
//     await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD)
//     return client
//   }

//   async resolveMemberDns(
//     dns: string[],
//   )
// : Promise<
//     Result<
//   dn: string
//   displayName?: string;
//   cn?: string;
//   sAMAccountName?: string
// [], ErrorValue>
//   > {
//     if (!dns || dns.length === 0) return { ok: true, value: [] }
//     const clientResult = await this.getAdminClient()
//     if (!clientResult.ok) {
//       logger.error(clientResult.error.message, null)
//       return { ok: false, error: { _tag: 'Internal', message: clientResult.error.message } }
//     }
//     const client = clientResult.value
//     const out: {
//       dn: string
//       displayName?: string
//       cn?: string
//       sAMAccountName?: string
//     }[] = []
//     try {
//       for (const dn of dns) {
//         try {
//           const res = await client.search(dn, {
//             scope: 'base',
//             attributes: MEMBER_RESOLVE_ATTRIBUTES as unknown as string[],
//           })
//           if (res.searchEntries.length > 0) {
//             const e = res.searchEntries[0]
//             const parsed = MemberResolveSchema.safeParse(e)
//             if (parsed.success) {
//               out.push({
//                 dn: parsed.data.dn || dn,
//                 displayName: parsed.data.displayName ?? parsed.data.cn,
//                 cn: parsed.data.cn,
//                 sAMAccountName: parsed.data.sAMAccountName,
//               })
//             } else {
//               out.push({ dn })
//             }
//           } else {
//             out.push({ dn })
//           }
//         } catch {
//           out.push({ dn })
//         }
//       }
//       return { ok: true, value: out }
//     } finally {
//       client.unbind()
//     }
//   }
