export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
export type ActionResult<T, E> = { ok: true; state: T } | { ok: false; state: T; error: E }
