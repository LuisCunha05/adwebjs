import type { Result } from '@/types/utils'

export async function retryResult<T, E>(
  fn: () => Promise<Result<T, E>>,
  retries = 3,
  delayMs = 500,
): Promise<Result<T, E>> {
  if (retries <= 0) {
    throw new Error('Retries must be greater than 0')
  }
  let lastResult: Result<T, E> | undefined
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fn()
    if (res.ok) {
      return res
    }
    lastResult = res
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
  if (!lastResult) {
    throw new Error('Unreachable: retry loop finished without result')
  }
  return lastResult
}
