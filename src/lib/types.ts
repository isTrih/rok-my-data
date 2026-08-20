/** 活动期次（/api/v1/queries/projects 返回项）。 */
export interface ProjectPeriod {
  activity_period_id: number;
  project_id: number;
  project_key: string;
  project_display_name: string;
  period: string;
}

export type AuditResult = "审核通过" | "审核不通过" | (string & {});

/** 审核状态归类：通过 / 不通过 / 审核中（既不通过也不不通过）。 */
export type AuditStage = "passed" | "rejected" | "pending";

export interface VideoMetric {
  stat_date: string | null;
  play_count: number | null;
  valid_play_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
}

export interface VideoRow {
  video_id: string;
  publish_time: string | null;
  author_name: string | null;
  author_uid: string | null;
  title: string | null;
  audit_result: AuditResult | null;
  /** 审核不通过时此字段为原因说明。 */
  label: string | null;
  latest_metric: VideoMetric | null;
}

export interface LiveRow {
  live_room_id: string;
  start_time: string | null;
  anchor_name: string | null;
  anchor_uid: string | null;
  title: string | null;
  live_exposure_pv: number | null;
  acu: number | null;
  pcu: number | null;
  live_duration_seconds: number | null;
  audit_result: AuditResult | null;
  label?: string | null;
}

export interface SearchResponse {
  ok: boolean;
  message?: string;
  scope?: { period?: string; period_code?: string };
  summary?: {
    video_count: number;
    live_session_count: number;
    total_content_count: number;
    total_play_count: number;
    total_live_exposure_pv: number;
  };
  videos?: { data: VideoRow[]; meta: { total: number } };
  live_sessions?: { data: LiveRow[]; meta: { total: number } };
}

export interface BelowThresholdResponse {
  ok: boolean;
  message?: string;
  summary?: {
    selected_user_count?: number;
    total_live_exposure_pv?: number;
    total_play_count?: number;
  };
}
