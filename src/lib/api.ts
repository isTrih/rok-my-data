import type { BelowThresholdResponse, ProjectPeriod, SearchResponse } from "./types";

/** ROK 查询的默认项目，塔塔调用时显式传入项目 3。 */
export const ROK_PROJECT_ID = 1;
export const PLAY_THRESHOLD = 100_000;
export const ACU_THRESHOLD = 10;
const PASSED = "审核通过";

export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(30000),
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || payload === null || (payload as { ok?: boolean }).ok === false) {
    throw new Error(payload?.message ?? `请求失败（${response.status}）`);
  }
  return payload;
}

/** 拉取并限定到指定项目的期次列表。 */
export async function fetchPeriods(projectId = ROK_PROJECT_ID): Promise<ProjectPeriod[]> {
  const list = await request<ProjectPeriod[]>("/api/v1/queries/projects");
  return list
    .filter(item => item.project_id === projectId)
    .sort((a, b) => b.activity_period_id - a.activity_period_id);
}

/** 按 key 精确查询该用户的全部视频 / 直播明细。 */
export async function searchByKey(activityPeriodId: number, key: string, projectId = ROK_PROJECT_ID) {
  const videos: NonNullable<SearchResponse["videos"]>["data"] = [];
  const lives: NonNullable<SearchResponse["live_sessions"]>["data"] = [];
  let first: SearchResponse | undefined;
  for (let offset = 0; ; offset += 500) {
    const page = await request<SearchResponse>("/api/v1/queries/v2/audit-extra/search", {
    activity_period_id: activityPeriodId,
    conditions: { key },
      limit: 500,
      offset,
      project_id: projectId,
    });
    first ??= page;
    videos.push(...(page.videos?.data ?? []));
    lives.push(...(page.live_sessions?.data ?? []));
    const total = Math.max(page.videos?.meta.total ?? 0, page.live_sessions?.meta.total ?? 0);
    if (offset + 500 >= total) break;
    if (!(page.videos?.data.length || page.live_sessions?.data.length)) throw new Error("数据分页不完整，请重试");
  }
  return { ...first, ok: true, videos: { data: videos, meta: { total: videos.length } }, live_sessions: { data: lives, meta: { total: lives.length } } };
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
