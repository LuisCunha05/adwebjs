import type { InternalError, ParseError } from './error'
import type { Result } from './utils'

export interface OU {
  dn: string
  ou?: string
  name?: string
  description?: string
}

export interface IOuService {
  listOUs(): Promise<Result<OU[], InternalError | ParseError>>
}
