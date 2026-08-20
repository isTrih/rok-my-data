import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const UPSTREAM = "https://autoxingtu.api.ali.trih.top";

// 本地开发通过 /api 代理转发到后端，避免调试域名不在 CORS 白名单内；
// 生产环境为纯静态站点，前端直连后端域名（后端已放行 CORS）。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": { target: UPSTREAM, changeOrigin: true, secure: true },
    },
  },
});
