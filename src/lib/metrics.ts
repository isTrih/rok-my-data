import type { AuditStage, LiveRow, SearchResponse, VideoRow } from "./types";

const PASSED = "审核通过";
const REJECTED = "审核不通过";

/** 有效直播日：单日过审时长累计超过 1 小时。 */
export const VALID_DAY_SECONDS = 3600;

/**
 * 审核状态归类。
 * - "审核通过" → passed
 * - "审核不通过" → rejected
 * - 空值或其他 → pending（待审核）
 */
export function auditStage(auditResult: string | null | undefined): AuditStage {
  const value = (auditResult ?? "").trim();
  if (value === PASSED) return "passed";
  if (value === REJECTED) return "rejected";
  return "pending";
}

export const isPassed = (row: { audit_result?: string | null }) => auditStage(row.audit_result) === "passed";

/** 未过审列表：待审核优先，其次是审核不通过。 */
const STAGE_ORDER: Record<AuditStage, number> = { pending: 0, rejected: 1, passed: 2 };

export function sortByStage<T extends { audit_result?: string | null }>(rows: T[], time: (row: T) => string | null) {
  return [...rows].sort((a, b) => {
    const stageDiff = STAGE_ORDER[auditStage(a.audit_result)] - STAGE_ORDER[auditStage(b.audit_result)];
    if (stageDiff !== 0) return stageDiff;
    return (time(b) ?? "").localeCompare(time(a) ?? "");
  });
}

/** 加权 ACU* = Σ(acu × 时长) / Σ(时长)，只统计过审场次。 */
export function weightedAcu(lives: LiveRow[]): number {
  let weighted = 0;
  let duration = 0;
  for (const live of lives) {
    const seconds = live.live_duration_seconds ?? 0;
    if (seconds <= 0) continue;
    weighted += (live.acu ?? 0) * seconds;
    duration += seconds;
  }
  return duration === 0 ? 0 : weighted / duration;
}

/** 以中国时区（+08:00）取直播日期，接口返回的时间已是北京时间且不带时区标记。 */
export function beijingDate(isoLike: string | null): string {
  if (!isoLike) return "";
  return isoLike.slice(0, 10);
}

export interface LiveDayStat {
  date: string;
  seconds: number;
  sessions: number;
  pv: number;
  valid: boolean;
}

/** 按中国时区日期聚合过审场次，标记有效直播天。 */
export function aggregateLiveDays(lives: LiveRow[]): Map<string, LiveDayStat> {
  const days = new Map<string, LiveDayStat>();
  for (const live of lives) {
    const date = beijingDate(live.start_time);
    if (!date) continue;
    const stat = days.get(date) ?? { date, seconds: 0, sessions: 0, pv: 0, valid: false };
    stat.seconds += live.live_duration_seconds ?? 0;
    stat.sessions += 1;
    stat.pv += live.live_exposure_pv ?? 0;
    stat.valid = stat.seconds > VALID_DAY_SECONDS;
    days.set(date, stat);
  }
  return days;
}

export interface QuerySnapshot {
  key: string;
  activityPeriodId: number;
  period: string;
  /** 过审视频播放量合计。 */
  playCount: number;
  /** 过审稿件数量。 */
  passedVideoCount: number;
  /** 过审直播 PV 合计。 */
  livePv: number;
  /** 加权 ACU*。 */
  weightedAcu: number;
  /** 过审场次。 */
  passedLiveCount: number;
  /** 有效直播天数。 */
  validLiveDays: number;
  hasVideo: boolean;
  hasLive: boolean;
  updatedAt: number;
}

export interface QueryResult {
  snapshot: QuerySnapshot;
  videos: VideoRow[];
  lives: LiveRow[];
  passedLives: LiveRow[];
  pendingVideos: VideoRow[];
  pendingLives: LiveRow[];
  liveDays: Map<string, LiveDayStat>;
  empty: boolean;
}

export function buildResult(
  response: SearchResponse,
  context: { key: string; activityPeriodId: number; period: string },
): QueryResult {
  const videos = response.videos?.data ?? [];
  const lives = response.live_sessions?.data ?? [];
  const passedVideos = videos.filter(isPassed);
  const passedLives = lives.filter(isPassed);
  const liveDays = aggregateLiveDays(passedLives);

  const playCount = passedVideos.reduce((sum, video) => sum + (video.latest_metric?.play_count ?? 0), 0);
  const livePv = passedLives.reduce((sum, live) => sum + (live.live_exposure_pv ?? 0), 0);

  return {
    snapshot: {
      ...context,
      playCount,
      passedVideoCount: passedVideos.length,
      livePv,
      weightedAcu: weightedAcu(passedLives),
      passedLiveCount: passedLives.length,
      validLiveDays: [...liveDays.values()].filter(day => day.valid).length,
      hasVideo: videos.length > 0,
      hasLive: lives.length > 0,
      updatedAt: Date.now(),
    },
    videos,
    lives,
    passedLives,
    pendingVideos: sortByStage(videos.filter(video => !isPassed(video)), video => video.publish_time),
    pendingLives: sortByStage(lives.filter(live => !isPassed(live)), live => live.start_time),
    liveDays,
    empty: videos.length === 0 && lives.length === 0,
  };
}
