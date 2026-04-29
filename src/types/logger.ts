export interface ILogger {
  info(msg: string, ...args: unknown[]): void
  debug(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
}
