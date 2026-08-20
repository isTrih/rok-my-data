import type { BelowThresholdResponse, ProjectPeriod, SearchResponse } from "./types";

/** 后端域名。开发环境走本地代理（同源 /api），生产直连（后端已放行 CORS）。 */
export const UPSTREAM_BASE = "https://autoxingtu.api.ali.trih.top";

/**
 * 开发环境走 Vite 的 /api 代理（同源），生产直连后端域名（后端已放行 CORS）。
 */
const API_BASE = import.meta.env.DEV ? "" : UPSTREAM_BASE;

/** 本页只关注 ROK 主项目。 */
export const ROK_PROJECT_ID = 1;
export const PLAY_THRESHOLD = 100_000;
export const ACU_THRESHOLD = 10;
const PASSED = "审核通过";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || payload === null) {
    throw new Error(payload?.message ?? `请求失败（${response.status}）`);
  }
  return payload;
}

/** 拉取期次列表，仅保留 project_id === 1 的期数。 */
export async function fetchPeriods(): Promise<ProjectPeriod[]> {
  const list = await request<ProjectPeriod[]>("/api/v1/queries/projects");
  return list
    .filter(item => item.project_id === ROK_PROJECT_ID)
    .sort((a, b) => b.activity_period_id - a.activity_period_id);
}

/** 按 key 精确查询该用户的全部视频 / 直播明细。 */
export function searchByKey(activityPeriodId: number, key: string) {
  return request<SearchResponse>("/api/v1/queries/v2/audit-extra/search", {
    activity_period_id: activityPeriodId,
    audit_result: "",
    conditions: { key },
    limit: 1000,
    project_id: ROK_PROJECT_ID,
  });
}

/** 加权 ACU 低于门槛的用户直播 PV 汇总（大盘对比用）。 */
export function fetchLivePvBelowAcu(activityPeriodId: number) {
  return request<BelowThresholdResponse>("/api/v1/queries/v2/audit-extra/live-pv/weighted-acu-below", {
    activity_period_id: activityPeriodId,
    project_id: ROK_PROJECT_ID,
    audit_result: PASSED,
    weighted_average_acu_lt: ACU_THRESHOLD,
  });
}

/** 总播放低于门槛的作者播放量汇总（大盘对比用）。 */
export function fetchPlayBelowTotal(activityPeriodId: number) {
  return request<BelowThresholdResponse>("/api/v1/queries/v2/audit-extra/video-play/author-total-below", {
    activity_period_id: activityPeriodId,
    project_id: ROK_PROJECT_ID,
    audit_result: PASSED,
    author_total_play_count_lt: PLAY_THRESHOLD,
  });
}
