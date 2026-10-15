import { request } from "./api";
import type { VideoRow } from "./types";

export interface RankingPool {
  participants: number;
  cutoffs: { top: number; value: number | null }[];
}
export interface TataPools {
  video: RankingPool & { total: number };
  strategy: RankingPool & { total: number };
  creative: RankingPool & { total: number };
  live: RankingPool & { total: number };
  acu: RankingPool;
  eligibleLive: { total: number; participants: number };
  updatedAt: string;
}
export const fetchTataPools = (activityPeriodId: number) => request<TataPools>("/api/tata/pools", { activity_period_id: activityPeriodId });

export function hasTag(row: VideoRow, tag: string): boolean {
  let value = row.extra_tag ?? row.audit_extra?.extra_tag;
  if (value && typeof value === "object" && !Array.isArray(value)) value = (value as { value?: unknown }).value;
  return (Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[,，、;；\s]+/) : []).includes(tag);
}
