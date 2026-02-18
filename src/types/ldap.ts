import type { ActiveDirectoryUser } from '@/schemas/attributesAd'
import type { DEFAULT_FETCH } from '../constants/ldap'

export type LdapUserAttributes = {
  [K in (typeof DEFAULT_FETCH)[number]]?: string | string[]
} & {
  [key: string]: string | string[] | undefined
}
export interface SearchUsersOptions {
  /** DN da OU onde buscar (base da busca). Se omitido, usa BASE_DN. */
  ou?: string
  /** DN do grupo: apenas usuários que são membros (memberOf). */
  memberOf?: string
  /** Se true, apenas contas desativadas (userAccountControl bit 2). */
  disabledOnly?: boolean
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateUserInput {
  parentOuDn: string
  sAMAccountName: string
  password: string
  userPrincipalName?: string
  cn?: string
  givenName?: string
  sn?: string
  displayName?: string
  mail?: string
  description?: string
  title?: string
  department?: string
  company?: string
  [key: string]: any
}

export interface DisableUserOptions {
  /** DN da OU de destino (ex.: OU=Desativados,DC=corp,DC=local). Se omitido, o usuário permanece na OU atual. */
  targetOu?: string
}

export interface ILdapService {
  authenticate(username: string, password: string): Promise<ActiveDirectoryUser>
  searchUsers(
    query: string,
    searchBy: string,
    options?: SearchUsersOptions,
  ): Promise<PaginatedResult<ActiveDirectoryUser>>
  getUser(id: string): Promise<ActiveDirectoryUser>
  createUser(input: CreateUserInput): Promise<ActiveDirectoryUser>
  deleteUser(id: string): Promise<void>
  setPassword(id: string, newPassword: string): Promise<void>
  updateUser(id: string, changes: any): Promise<ActiveDirectoryUser>
  searchGroups(query: string): Promise<any[]>
  getGroup(id: string): Promise<any>
  updateGroup(id: string, changes: any): Promise<any>
  moveUserToOu(id: string, targetOuDn: string): Promise<void>
  disableUser(id: string, options?: DisableUserOptions): Promise<void>
  enableUser(id: string): Promise<void>
  unlockUser(id: string): Promise<void>
  listOUs(): Promise<any[]>
  addMemberToGroup(groupCn: string, memberDn: string): Promise<void>
  removeMemberFromGroup(groupCn: string, memberDn: string): Promise<void>
  resolveMemberDns(
    dns: string[],
  ): Promise<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]>
  getStats(): Promise<{ usersCount: number; disabledCount: number; groupsCount: number }>
}
export interface ConfigFile {
  fetch?: string[]
  edit?: EditAttribute[]
  /** Atributos extras só para fetch (ex.: cpf). Serão incluídos no fetch e em edit em "Outros" com label = nome. */
  extraFetch?: string[]
  /** Atributos customizados para edição (ex.: { name: "cpf", label: "CPF", section: "Documentos" }). */
  extraEdit?: EditAttribute[]
}
export interface EditAttribute {
  name: string
  label: string
  section: string
}
