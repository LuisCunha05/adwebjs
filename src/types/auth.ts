import type { ActiveDirectoryUser } from '@/schemas/attributesAd'
import type { InternalError, NotFoundError, ParseError, UnauthorizedError } from './error'
import type { Result } from './utils'

export interface IAuthService {
  getUser(
    id: string,
  ): Promise<Result<{ dn: string; userAccountControl: string }, NotFoundError | ParseError>>
  authenticate(
    username: string,
    password: string,
  ): Promise<Result<ActiveDirectoryUser, UnauthorizedError | InternalError | NotFoundError>>
  setPassword(
    id: string,
    newPassword: string,
  ): Promise<Result<null, InternalError | NotFoundError | ParseError>>
  disableUser(
    id: string,
    targetOu?: string,
  ): Promise<Result<null, NotFoundError | ParseError | InternalError>>
  enableUser(id: string): Promise<Result<null, NotFoundError | ParseError | InternalError>>
  unlockUser(id: string): Promise<Result<null, NotFoundError | ParseError | InternalError>>
  deleteUser(id: string): Promise<Result<null, NotFoundError | ParseError | InternalError>>
}
