# 万国觉醒创作营 · 活动数据查询

纯前端静态站点，使用 React + Vite + Tailwind CSS 构建，支持创作者查询视频与直播数据，展示播放量、直播 PV、加权 ACU*、有效直播天数等核心指标，并在数据增长时提供动画反馈与礼花庆祝效果。

## 功能特性

- **查询前**：活动头图（占位）、简介、表单（创作者 key + 期数选择），输入内容缓存在浏览器
- **查询后（未查到数据）**：提示用户联系微信小助手「洛洛」
- **查询后（有数据）**：
  - 概览指标卡：播放量、过审稿件数量、直播 PV、直播加权 ACU*、过审场次
  - 视频数据：过审数量、过审播放量，若播放量 < 10万 展示占比环形图
  - 直播数据：过审场次、加权 ACU*、总 PV、有效直播天数，若 ACU* < 10 展示占比环形图，附带直播日历（按中国时区聚合，有效天高亮）
  - 未过审明细：两个 Tab（视频未过审 / 直播未过审），审核中优先展示，支持分页
- **增长反馈**：与上次缓存对比，指标增长时触发卡片高亮动画与礼花效果

## 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8 + @vitejs/plugin-react + @tailwindcss/vite
- **包管理器**：Bun
- **样式**：Tailwind CSS v4（inline @theme）
- **动画**：Motion（未使用）、canvas-confetti（礼花）
- **后端对接**：
  - 本地开发：Vite proxy 将 `/api` 转发到 `https://autoxingtu.api.ali.trih.top`
  - 生产环境：前端直连后端域名（后端已放行 CORS）

## 开发与构建

```bash
# 安装依赖
bun install

# 启动开发服务器（http://localhost:3000，支持 HMR）
bun run dev

# 类型检查
bun run typecheck

# 构建生产静态资源到 dist/
bun run build

# 预览构建结果
bun run preview

# 类型检查 + 构建
bun run check
```

## 部署

构建后将 `dist/` 目录部署到腾讯 EdgeOne Pages 或任意静态托管服务即可。前端会通过运行时判断直连后端 API。

## 项目结构

```
src/
├── lib/
│   ├── api.ts              # API 请求封装（开发环境走代理，生产直连）
│   ├── types.ts            # 接口类型定义
│   ├── metrics.ts          # 加权 ACU、日历聚合、审核分类、结果构建
│   ├── format.ts           # 格式化工具（千分位、时长、标题脱敏、链接）
│   ├── storage.ts          # LocalStorage 缓存（表单、快照）
│   └── celebrate.ts        # 增长对比与礼花效果
├── components/
│   ├── Frame.tsx           # Panel 容器、头图占位
│   ├── SearchForm.tsx      # 查询表单（创作者 key + 期数）
│   ├── EmptyState.tsx      # 未查到数据提示、活动简介
│   ├── MetricCard.tsx      # 指标卡（含增长动画）
│   ├── ShareDonut.tsx      # 占比环形图（不展示具体百分比）
│   ├── LiveCalendar.tsx    # 直播日历（有效天高亮）
│   ├── PendingTabs.tsx     # 未过审 Tab 表格（审核中优先）
│   └── ResultView.tsx      # 查询结果总览（概览→直播→视频→未过审）
├── App.tsx                 # 主应用（查询编排、缓存对比、动画触发）
├── main.tsx                # React 入口
├── index.css               # Tailwind 主题与自定义动画
└── vite-env.d.ts           # Vite 环境类型

vite.config.ts              # Vite 配置（React + Tailwind + dev proxy）
tsconfig.json               # TypeScript 配置
package.json                # 依赖与脚本
index.html                  # HTML 入口
```

## API 接口

- `GET /api/v1/queries/projects` - 查询活动期次列表（仅使用 project_id=1 的 ROK 期数）
- `POST /api/v1/queries/v2/audit-extra/search` - 按 key 精确查询用户视频与直播明细
- `POST /api/v1/queries/v2/audit-extra/video-play/author-total-below` - 播放量低于门槛的作者总播放（对比用）
- `POST /api/v1/queries/v2/audit-extra/live-pv/weighted-acu-below` - 加权 ACU 低于门槛的主播总 PV（对比用）

## 数据说明

- **加权 ACU*** = Σ(acu × 直播时长) / Σ(直播时长)，仅统计过审场次
- **有效直播日**：按中国时区（+08:00）聚合，单日过审时长累计超过 1 小时
- **审核状态**：
  - 审核通过：`audit_result === "审核通过"`
  - 审核不通过：`audit_result === "审核不通过"`
  - 审核中：既不是通过也不是不通过（含空值），在未过审明细中优先展示
- **标题脱敏**：前 5 字符 + `...` + 后 5 字符（总长 ≤ 13 时不脱敏）

## License

MIT
