import confetti from "canvas-confetti";
import type { QuerySnapshot } from "./metrics";

const TRACKED = [
  "playCount",
  "passedVideoCount",
  "livePv",
  "weightedAcu",
  "passedLiveCount",
  "validLiveDays",
] as const satisfies readonly (keyof QuerySnapshot)[];

export type TrackedMetric = (typeof TRACKED)[number];

/** 与上次缓存对比，返回有增长的指标。首次查询无缓存时视为全 0。 */
export function diffSnapshot(current: QuerySnapshot, previous: QuerySnapshot | null): TrackedMetric[] {
  return TRACKED.filter(field => current[field] > (previous?.[field] ?? 0));
}

/** 数据增长时的礼花反馈。 */
export function celebrate(level: number) {
  if (level <= 0) return;
  const colors = ["#8a4b22", "#c98a4b", "#f0d9b5", "#e8c48c"];
  const bursts = Math.min(3, Math.max(1, Math.ceil(level / 2)));

  for (let index = 0; index < bursts; index += 1) {
    setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 68,
        startVelocity: 42,
        scalar: 0.9,
        origin: { x: 0.2 + 0.3 * index, y: 0.32 },
        colors,
        disableForReducedMotion: true,
      });
    }, index * 220);
  }
}
