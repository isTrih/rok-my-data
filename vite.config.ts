import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function localApi(auth: string): Plugin {
  return {
    name: "local-edge-api",
    configureServer(server) {
      server.middlewares.use(async (incoming, outgoing, next) => {
        if (!incoming.url?.startsWith("/api/")) return next();
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of incoming) {
            size += chunk.length;
            if (size > 1024 * 1024) {
              outgoing.writeHead(413).end();
              return;
            }
            chunks.push(Buffer.from(chunk));
          }
          const method = incoming.method ?? "GET";
          const request = new Request(`http://localhost${incoming.url}`, {
            method,
            headers: { "content-type": "application/json" },
            ...(method !== "GET" && method !== "HEAD" ? { body: Buffer.concat(chunks).toString("utf8") } : {}),
          });
          const { default: onRequest } = await server.ssrLoadModule("/edge-functions/api/[[default]].js");
          const response: Response = await onRequest({ request, env: { auth } });
          outgoing.writeHead(response.status, Object.fromEntries(response.headers));
          outgoing.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          outgoing.writeHead(502, { "content-type": "application/json; charset=utf-8" });
          outgoing.end(JSON.stringify({ message: "本地接口代理暂时不可用" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // auth is server-only: never use a VITE_ prefix for this credential.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), localApi(env.auth ?? "")],
    server: {
      port: 3000,
    },
  };
});
