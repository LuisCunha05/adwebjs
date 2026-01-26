const base = "";

async function api<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...rest } = init ?? {};
  const url = params ? `${base}${path}?${new URLSearchParams(params)}` : `${base}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...rest.headers },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type Session = { user: { sAMAccountName: string; cn?: string; mail?: string; userPrincipalName?: string }; isAdmin: boolean; canDelete?: boolean };

export const auth = {
  me: () => api<Session>("/api/auth/me"),
  login: (username: string, password: string) =>
    api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export type EditAttribute = { name: string; label: string; section: string };

export const config = {
  userAttributes: () =>
    api<{ fetch: string[]; edit: EditAttribute[] }>("/api/config/user-attributes"),
};

export const users = {
  list: (q: string, searchBy: string) =>
    api<{ users: any[] }>("/api/users", { params: { q, searchBy } }),
  get: (id: string) => api<any>(`/api/users/${encodeURIComponent(id)}`),
  create: (body: {
    parentOuDn: string;
    sAMAccountName: string;
    password: string;
    userPrincipalName?: string;
    cn?: string;
    givenName?: string;
    sn?: string;
    displayName?: string;
    mail?: string;
    description?: string;
    title?: string;
    department?: string;
    company?: string;
    [k: string]: unknown;
  }) =>
    api<any>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api<any>(`/api/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  disable: (id: string, opts?: { targetOu?: string }) =>
    api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}/disable`, {
      method: "POST",
      body: JSON.stringify(opts?.targetOu ? { targetOu: opts.targetOu } : {}),
    }),
  enable: (id: string) => api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}/enable`, { method: "POST" }),
  moveToOu: (id: string, targetOuDn: string) =>
    api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: JSON.stringify({ targetOuDn }),
    }),
  unlock: (id: string) => api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}/unlock`, { method: "POST" }),
  resetPassword: (id: string, newPassword: string) =>
    api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
  delete: (id: string) =>
    api<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export type ScheduledAction = {
  id: string;
  type: "disable" | "enable";
  userId: string;
  runAt: string;
  createdAt: string;
  meta?: { vacationId?: string; startDate?: string; endDate?: string; description?: string };
};

export const schedule = {
  list: () => api<{ actions: ScheduledAction[] }>("/api/schedule"),
  createVacation: (userId: string, startDate: string, endDate: string) =>
    api<{ ok: boolean; disableId: string; enableId: string }>("/api/schedule/vacation", {
      method: "POST",
      body: JSON.stringify({ userId, startDate, endDate }),
    }),
  cancel: (id: string) =>
    api<{ ok: boolean }>(`/api/schedule/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const stats = {
  get: () => api<{ usersCount: number; disabledCount: number; groupsCount: number }>("/api/stats"),
};

export const ous = {
  list: () => api<{ ous: any[] }>("/api/ous"),
};

export const groups = {
  list: (q: string) => api<{ groups: any[] }>("/api/groups", { params: { q } }),
  get: (id: string) => api<any>(`/api/groups/${encodeURIComponent(id)}`),
  update: (id: string, body: { name?: string; description?: string; member?: string[] }) =>
    api<any>(`/api/groups/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  getMembersResolved: (id: string) =>
    api<{ members: { dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[] }>(
      `/api/groups/${encodeURIComponent(id)}/members/resolved`
    ),
  addMember: (id: string, dn: string) =>
    api<{ ok: boolean }>(`/api/groups/${encodeURIComponent(id)}/members/add`, {
      method: "POST",
      body: JSON.stringify({ dn }),
    }),
  removeMember: (id: string, dn: string) =>
    api<{ ok: boolean }>(`/api/groups/${encodeURIComponent(id)}/members/remove`, {
      method: "POST",
      body: JSON.stringify({ dn }),
    }),
};

export type AuditEntry = {
  id: string;
  at: string;
  action: string;
  actor: string;
  target?: string;
  details?: Record<string, unknown>;
  success: boolean;
  error?: string;
};

export const audit = {
  list: (filters?: { since?: string; until?: string; action?: string; actor?: string; target?: string; limit?: number }) => {
    const params: Record<string, string> = {};
    if (filters?.since) params.since = filters.since;
    if (filters?.until) params.until = filters.until;
    if (filters?.action) params.action = filters.action;
    if (filters?.actor) params.actor = filters.actor;
    if (filters?.target) params.target = filters.target;
    if (filters?.limit != null) params.limit = String(filters.limit);
    return api<{ entries: AuditEntry[] }>(
      "/api/audit-logs",
      Object.keys(params).length ? { params } : {}
    );
  },
};
