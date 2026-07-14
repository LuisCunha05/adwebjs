export interface ErrorValue {
  _tag: string
  message: string
}

export interface InternalError extends ErrorValue {
  _tag: 'Internal'
}

export interface NotFoundError extends ErrorValue {
  _tag: 'NotFound'
}

export interface InvalidShapeError extends ErrorValue {
  _tag: 'InvalidShape'
}

export interface ParseError extends ErrorValue {
  _tag: 'Parse'
}

export interface MissingVariableError extends ErrorValue {
  _tag: 'MissingVariable'
}

export interface UnauthorizedError extends ErrorValue {
  _tag: 'Unauthorized'
}
