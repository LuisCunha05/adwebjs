import type { ILogger } from '@/types/logger'

const LOG_LEVEL = Object.freeze({
  INFO: 'info',
  DEBUG: 'debug',
  ERROR: 'error',
  ALL: 'all',
  NONE: 'none',
} as const)

type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]

class Logger implements ILogger {
  #level: LogLevel

  constructor(level: LogLevel) {
    this.#level = level
  }

  info(msg: string, ...args: unknown[]) {
    if (!this.#canLog(LOG_LEVEL.INFO)) return

    console.info(`[${new Date().toISOString()}] ${msg}`, ...args)
  }

  debug(msg: string, ...args: unknown[]) {
    if (!this.#canLog(LOG_LEVEL.DEBUG)) return

    console.log(`[${new Date().toISOString()}] ${msg}`, ...args)
  }

  error(msg: string, ...args: unknown[]) {
    if (!this.#canLog(LOG_LEVEL.ERROR)) return

    console.error(`[${new Date().toISOString()}] ${msg}`, ...args)
    console.trace()
  }

  #canLog(lvl: LogLevel): boolean {
    switch (lvl) {
      case LOG_LEVEL.ALL:
        return true
      case LOG_LEVEL.NONE:
        return false
      case LOG_LEVEL.DEBUG:
        return this.#level === LOG_LEVEL.DEBUG
      case LOG_LEVEL.INFO:
        return this.#level === LOG_LEVEL.INFO
      case LOG_LEVEL.ERROR:
        return this.#level === LOG_LEVEL.ERROR
    }
  }
}

export const logger = new Logger(LOG_LEVEL.ALL)
