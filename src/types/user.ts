import type { ActiveDirectoryUser, UpdateUserInput } from '@/schemas/attributesAd'
import type { InternalError, NotFoundError, ParseError } from './error'
import type { Result } from './utils'

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
}

export interface IUserService {
  search(
    query: string,
    searchBy: string,
    options?: SearchUsersOptions,
  ): Promise<Result<PaginatedResult<ActiveDirectoryUser>, InternalError>>
  get(id: string): Promise<Result<ActiveDirectoryUser, InternalError | NotFoundError | ParseError>>
  create(input: CreateUserInput): Promise<Result<ActiveDirectoryUser, InternalError>>
  update(
    id: string,
    changes: UpdateUserInput,
  ): Promise<Result<ActiveDirectoryUser, InternalError | NotFoundError>>
  moveOu(id: string, targetOuDn: string): Promise<Result<null, InternalError | NotFoundError>>
}
