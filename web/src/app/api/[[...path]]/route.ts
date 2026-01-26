const API_BASE = (process.env.API_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

async function proxy(
  request: Request,
  method: string,
  path: string[]
): Promise<Response> {
  const pathStr = path.length ? path.join("/") : "";
  const search = request.url.includes("?") ? "?" + new URL(request.url).searchParams.toString() : "";
  const url = `${API_BASE}/api${pathStr ? `/${pathStr}` : ""}${search}`;
  const headers = new Headers(request.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.delete("host");
  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    body = undefined;
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de conexão";
    return new Response(
      JSON.stringify({ error: `API indisponível: ${msg}. Verifique se a API está em execução em ${API_BASE}.` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
  const resHeaders = new Headers(res.headers);
  resHeaders.delete("content-encoding");
  resHeaders.set("content-type", res.headers.get("content-type") || "application/json");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

type Params = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "GET", path);
}

export async function POST(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "POST", path);
}

export async function PATCH(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "PATCH", path);
}

export async function PUT(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "PUT", path);
}

export async function DELETE(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "DELETE", path);
}

export async function HEAD(request: Request, { params }: Params) {
  const { path = [] } = await params;
  return proxy(request, "HEAD", path);
}
