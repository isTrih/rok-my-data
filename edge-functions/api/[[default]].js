const UPSTREAM = "https://autoxingtu.api.ali.trih.top";

const ROUTES = new Map([
  ["/api/v1/queries/projects", "GET"],
  ["/api/v1/queries/v2/audit-extra/search", "POST"],
  ["/api/v1/queries/v2/audit-extra/video-play/author-total-below", "POST"],
  ["/api/v1/queries/v2/audit-extra/live-pv/weighted-acu-below", "POST"],
]);

function jsonError(message, status) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname;
  const method = ROUTES.get(path);

  if (!method) return jsonError("接口不存在", 404);
  if (request.method !== method) return jsonError("请求方式不支持", 405);
  if (!env.auth) return jsonError("服务端认证未配置", 500);

  try {
    const headers = new Headers();
    if (method === "POST") headers.set("content-type", "application/json");
    // 上游认证头在部署时由 Makers 的 auth 环境变量提供。
    headers.set("Authorization", `Bearer ${env.auth}`);

    const response = await fetch(`${UPSTREAM}${path}`, {
      method,
      headers,
      body: method === "POST" ? await request.text() : undefined,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return jsonError("上游服务暂时不可用", 502);
  }
}
