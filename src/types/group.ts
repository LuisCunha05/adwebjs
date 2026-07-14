import type { Group } from '@/schemas/attributesAd'
import type { InternalError, NotFoundError, ParseError } from './error'
import type { Result } from './utils'

export type IGroupUpdate = {
  description?: string
  member?: string[]
}

export interface IGroupService {
  search(query: string): Promise<Result<Group[], InternalError | ParseError>>
  get(id: string): Promise<Result<Group, ParseError | InternalError | NotFoundError>>
  update(id: string, changes: IGroupUpdate): Promise<Result<number, InternalError | NotFoundError>>
  addMember(groupCn: string, memberDn: string): Promise<Result<null, InternalError | NotFoundError>>
  removeMember(
    groupCn: string,
    memberDn: string,
  ): Promise<Result<null, InternalError | NotFoundError>>
}
