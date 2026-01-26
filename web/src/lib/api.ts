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

export type Session = { user: { sAMAccountName: string; cn?: string; mail?: string; userPrincipalName?: string }; isAdmin: boolean };

export const auth = {
  me: () => api<Session>("/api/auth/me"),
  login: (username: string, password: string) =>
    api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export const users = {
  list: (q: string, searchBy: string) =>
    api<{ users: any[] }>("/api/users", { params: { q, searchBy } }),
  get: (id: string) => api<any>(`/api/users/${encodeURIComponent(id)}`),
  update: (id: string, body: Record<string, unknown>) =>
    api<any>(`/api/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
};

export const groups = {
  list: (q: string) => api<{ groups: any[] }>("/api/groups", { params: { q } }),
  get: (id: string) => api<any>(`/api/groups/${encodeURIComponent(id)}`),
  update: (id: string, body: { name?: string; description?: string; member?: string[] }) =>
    api<any>(`/api/groups/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
};
