import type {
  InternalError,
  InvalidShapeError,
  MissingVariableError,
  NotFoundError,
  ParseError,
  UnauthorizedError,
} from '@/types/error'
import type { Result } from '@/types/utils'

type ErrorUnion =
  | InternalError
  | InvalidShapeError
  | MissingVariableError
  | NotFoundError
  | ParseError
  | UnauthorizedError

type ErrorResult<TError> = Exclude<Result<never, TError>, { ok: true }>

export const errorResult = <T extends ErrorUnion['_tag']>(
  kind: T,
  message: string,
): ErrorResult<
  Extract<
    ErrorUnion,
    {
      _tag: T
    }
  >
> => ({
  ok: false as const,
  error: { _tag: kind, message } as Extract<ErrorUnion, { _tag: T }>,
})

export const isErrorType = <T extends ErrorUnion['_tag']>(
  kind: T,
  errorObj: ErrorUnion,
): errorObj is Extract<
  ErrorUnion,
  {
    _tag: T
  }
> => {
  return errorObj._tag === kind
}
