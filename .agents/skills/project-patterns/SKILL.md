---
name: project-patterns
description: Guidelines and code patterns for forms, server actions, data queries, client-side searching, and server-side data fetching using the Result type in the adwebjs project. Use this skill whenever you write or refactor forms, actions, queries, search features, or authorization checks in this project.
---

# project-patterns

This skill defines the development standards and architectural patterns for the [adwebjs](file:///home/lcunha/projects/adwebjs) codebase. Follow these patterns to ensure consistency, security, and type safety.

## 0. Server-Side Data Fetching & Result Pattern

### Rules
- **No Client-Side Fetching:** ALL data fetching must be executed on the server.
- **Type-Safe Results:** All data-fetching queries, services, and server actions must return responses using the [Result](file:///home/lcunha/projects/adwebjs/src/types/utils.ts) type defined in [src/types/utils.ts](file:///home/lcunha/projects/adwebjs/src/types/utils.ts):
  ```typescript
  export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
  ```
- **Error Separation:** Use the specialized error interfaces from [src/types/error.ts](file:///home/lcunha/projects/adwebjs/src/types/error.ts) (e.g., `InternalError`, `UnauthorizedError`, `InvalidShapeError`) and instantiate them using [errorResult](file:///home/lcunha/projects/adwebjs/src/utils/error.ts) from [src/utils/error.ts](file:///home/lcunha/projects/adwebjs/src/utils/error.ts).
- **Avoid try/catch:** Since services already return error objects as values (using the `Result` type), avoid wrapping service calls in `try/catch` blocks unless handling unexpected exceptions (e.g. network/system level failures).
- **Authorization Check:** Every data fetch must perform an authorization check with `await getSessionCached()`.

### Example
```typescript
import 'server-only'
import { getSessionCached } from '@/queries/session'
import type { Result } from '@/types/utils'
import type { InternalError } from '@/types/error'
import { errorResult } from '@/utils/error'

export async function fetchData(): Promise<Result<SomeData, InternalError>> {
  // Authorization check
  await getSessionCached()

  // Service returns errors as values, no try/catch wrapper needed
  const res = await someService.get()
  if (!res.ok) {
    return errorResult('Internal', res.error.message || 'Fetch failed')
  }
  return { ok: true, value: res.value }
}
```

---

## 1. Forms, Server Actions & Validation

### Rules
- **Hook usage:** Client-side forms must use the `useActionState` hook (from `react`) to bind server actions.
- **Server Action Validation:** All user inputs must be validated within the server action using **Zod**.
- **Authorization Check:** All server actions MUST perform an authorization check as their first step using [getSessionCached](file:///home/lcunha/projects/adwebjs/src/queries/session.ts) from [src/queries/session.ts](file:///home/lcunha/projects/adwebjs/src/queries/session.ts).
- **Do NOT catch authorization redirect:** Do not wrap `await getSessionCached()` in a `try/catch` block. This is critical because `getSessionCached` throws a Next.js redirect error for unauthenticated access, and catching it breaks the redirect flow.

### Action Example
```typescript
'use server'

import { getSessionCached } from '@/queries/session'
import { z } from 'zod'
import type { Result } from '@/types/utils'
import type { InternalError, UnauthorizedError, InvalidShapeError } from '@/types/error'
import { errorResult } from '@/utils/error'

const FormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
})

export async function createItemAction(
  prevState: Result<Item, InternalError | UnauthorizedError | InvalidShapeError> | null,
  formData: FormData
): Promise<Result<Item, InternalError | UnauthorizedError | InvalidShapeError>> {
  // 1. Authorization check (Do NOT wrap in try/catch to avoid breaking Next.js redirect throw)
  await getSessionCached()

  // 2. Input validation
  const validation = FormSchema.safeParse({
    title: formData.get('title'),
  })

  if (!validation.success) {
    return errorResult('InvalidShape', validation.error.issues[0].message)
  }

  // 3. Logic execution (directly return service response)
  const res = await service.create(validation.data)
  if (!res.ok) {
    return errorResult('Internal', res.error.message)
  }
  return { ok: true, value: res.value }
}
```

### Client Form Example
```typescript
'use client'

import { useActionState } from 'react'
import { createItemAction } from '@/actions/items'

export function ItemForm() {
  const [state, formAction, isPending] = useActionState(createItemAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required />
      </div>
      
      {state && !state.ok && (
        <p className="text-red-500">{state.error.message}</p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

---

## 2. Data Queries & Services

### Rules
- **Location:** All query functions must be placed inside the [src/queries](file:///home/lcunha/projects/adwebjs/src/queries) folder.
- **Environment Safety:** File must start with `import 'server-only'`.
- **Authorization Check:** Every query function MUST start by executing an authorization check with `await getSessionCached()`.
- **Caching:** If the query function has **no arguments**, wrap it using the React `cache` function for request caching. Functions with arguments should not use `cache` unless specific request-scoped memoization is intended for those argument values.
- **Service Integration:** Database-related data/queries must NOT be run directly in queries files. They should first be added to the appropriate service class (e.g., in [src/services](file:///home/lcunha/projects/adwebjs/src/services)), with the corresponding method added to its interface/contract, and return a `Result` type. The query function should then invoke this service method.

### Query Example (No Arguments)
```typescript
import 'server-only'
import { cache } from 'react'
import { getSessionCached } from '@/queries/session'
import { statsService } from '@/services/container'
import type { Result } from '@/types/utils'
import type { InternalError } from '@/types/error'
import { errorResult } from '@/utils/error'

export const getDashboardStats = cache(async (): Promise<Result<Stats, InternalError>> => {
  // Authorization Check
  await getSessionCached()

  // Calling service which returns a Result (no local try/catch necessary if service handles errors)
  const res = await statsService.getStats()
  if (!res.ok) {
    return errorResult('Internal', res.error.message || 'Failed to retrieve stats')
  }
  return { ok: true, value: res.value }
})
```

### Query Example (With Arguments)
```typescript
import 'server-only'
import { getSessionCached } from '@/queries/session'
import { userService } from '@/services/container'
import type { Result } from '@/types/utils'
import type { InternalError } from '@/types/error'
import { errorResult } from '@/utils/error'

export async function getUserById(id: string): Promise<Result<User, InternalError>> {
  // Authorization Check
  await getSessionCached()

  // Calling service which returns a Result
  const res = await userService.getUser(id)
  if (!res.ok) {
    return errorResult('Internal', res.error.message || 'Failed to retrieve user')
  }
  return { ok: true, value: res.value }
}
```

---

## 3. Client Search Using Query Parameters

### Rules
- **URL-Based State:** User client-related search, filters, or pagination must use URL query parameters (search parameters) instead of local React component state.
- **Benefits:** Ensures search states are shareable, bookmarkable, and trigger server-side re-fetching when query parameters change.

### Example React Component
```typescript
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export function SearchFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search users..."
        defaultValue={searchParams.get('q') || ''}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-md"
      />
      {isPending && <span className="absolute right-3 top-3 animate-spin">⏳</span>}
    </div>
  )
}
```

---

## 4. Async Data Fetching with Suspense & React.use

### Rules
- **Non-blocking Rendering:** To prevent pages from feeling slow or stuck while waiting for slow database/external data fetches on the server, initiate the data fetch as a Promise in Server Components.
- **Promise Passing:** Pass the unresolved Promise down to Client Components as a prop.
- **Suspense & React.use:** Wrap the Client Component in a `<Suspense>` boundary (with a fallback UI) in the Server Component. Inside the Client Component, resolve the Promise using React's `use()` hook.
- **Await Next.js 15 Page/Layout Params:** Page `params` and `searchParams` are Promises in Next.js 15 and must be explicitly awaited before accessing properties (e.g. `const { id } = await params`).

### Server Component Example (`page.tsx`)
```typescript
import { Suspense } from 'react'
import { getUserById } from '@/queries/users'
import { UserProfile } from './user-profile'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 15, dynamic route params must be awaited first
  const { id } = await params

  // Fetch starts on the server but doesn't block page rendering (unawaited Promise)
  const userPromise = getUserById(id)

  return (
    <div className="container mx-auto p-4">
      <h1>User Dashboard</h1>
      <Suspense fallback={<p>Loading user profile...</p>}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
    </div>
  )
}
```

### Client Component Example (`user-profile.tsx`)
```typescript
'use client'

import { use } from 'react'
import type { Result } from '@/types/utils'
import type { User } from '@/types/user'
import type { InternalError } from '@/types/error'

export function UserProfile({ userPromise }: { userPromise: Promise<Result<User, InternalError>> }) {
  // Resolves the promise in the client component using the 'use' hook
  const res = use(userPromise)

  if (!res.ok) {
    return <div className="text-red-500">Error: {res.error.message}</div>
  }

  const user = res.value
  return (
    <div className="p-4 border rounded-md shadow-sm">
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  )
}
```
