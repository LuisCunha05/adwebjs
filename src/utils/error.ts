import type {
  InternalError,
  InvalidShapeError,
  MissingVariableError,
  NotFoundError,
  ParseError,
  UnauthorizedError,
} from '@/types/error'
import type { ActionResult, Result } from '@/types/utils'

type ErrorUnion =
  | InternalError
  | InvalidShapeError
  | MissingVariableError
  | NotFoundError
  | ParseError
  | UnauthorizedError

type ErrorResult<TError> = Exclude<Result<never, TError>, { ok: true }>
type ErrorActionResult<TData, TError> = Exclude<ActionResult<TData, TError>, { ok: true }>

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

export const errorActionResult = <Data, T extends ErrorUnion['_tag']>(
  state: Data,
  kind: T,
  message: string,
): ErrorActionResult<Data,
  Extract<
    ErrorUnion,
    {
      _tag: T
    }
  >
> => ({
  ok: false as const,
  state,
  error: { _tag: kind, message } as Extract<ErrorUnion, { _tag: T }>,
})
