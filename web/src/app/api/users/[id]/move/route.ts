const API_BASE = (process.env.API_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = `${API_BASE}/api/users/${encodeURIComponent(id)}/move`;
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("host");
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    body = undefined;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
    const data = await res.json().catch(() => ({}));
    const resHeaders = new Headers();
    resHeaders.set("Content-Type", res.headers.get("Content-Type") || "application/json");
    return new Response(JSON.stringify(data), {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de conexão";
    return new Response(
      JSON.stringify({
        error: `API indisponível: ${msg}. Verifique se a API está em execução em ${API_BASE}.`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
