import { Panel } from "./Frame";
import { MetricCard } from "./MetricCard";
import { ShareDonut } from "./ShareDonut";
import { LiveCalendar } from "./LiveCalendar";
import { PendingTabs } from "./PendingTabs";
import { formatAcu, formatDuration, formatInt } from "../lib/format";
import { ACU_THRESHOLD, PLAY_THRESHOLD } from "../lib/api";
import type { QueryResult, QuerySnapshot } from "../lib/metrics";
import type { TrackedMetric } from "../lib/celebrate";

export interface PoolTotals {
  /** 十万播放以下作者的总播放量。 */
  playPool: number | null;
  /** 加权 ACU 低于 10 的主播总 PV。 */
  livePvPool: number | null;
}

/** 查询结果展示：创作者名称 → 概览 → 直播 → 视频 → 未过审明细。 */
export function ResultView({
  result,
  previous,
  grown,
  pools,
}: {
  result: QueryResult;
  previous: QuerySnapshot | null;
  grown: TrackedMetric[];
  pools: PoolTotals;
}) {
  const { snapshot, liveDays, passedLives, pendingVideos, pendingLives } = result;
  const prior = (field: TrackedMetric) => (grown.includes(field) ? (previous?.[field] ?? 0) : null);

  const showPlayShare = snapshot.playCount > 0 && snapshot.playCount < PLAY_THRESHOLD && (pools.playPool ?? 0) > 0;
  const showPvShare = snapshot.weightedAcu > 0 && snapshot.weightedAcu < ACU_THRESHOLD && (pools.livePvPool ?? 0) > 0;

  // 从视频或直播数据中提取创作者名称
  const authorName = result.videos[0]?.author_name ?? result.lives[0]?.anchor_name ?? null;

  return (
    <div className="space-y-4">
      {authorName ? (
        <div className="panel rise-fade px-5 py-3 text-center">
          <p className="mt-0.5 font-display text-xl text-brand">{authorName}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        <MetricCard label="播放量" value={snapshot.playCount} display={formatInt(snapshot.playCount)} previous={prior("playCount")} delay={0} />
        <MetricCard label="过审稿件数量" value={snapshot.passedVideoCount} display={formatInt(snapshot.passedVideoCount)} previous={prior("passedVideoCount")} delay={90} />
        <MetricCard label="直播PV" value={snapshot.livePv} display={formatInt(snapshot.livePv)} previous={prior("livePv")} delay={180} />
        <MetricCard label="直播加权ACU*" value={snapshot.weightedAcu} display={formatAcu(snapshot.weightedAcu)} previous={prior("weightedAcu")} delay={270} />
        <MetricCard label="过审场次" value={snapshot.passedLiveCount} display={formatInt(snapshot.passedLiveCount)} previous={prior("passedLiveCount")} delay={360} />
      </div>

      {snapshot.hasLive ? (
        <Panel title="直播数据" className="rise-fade">
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="直播过审场次" value={formatInt(snapshot.passedLiveCount)} />
              <Stat label="当前加权ACU*" value={formatAcu(snapshot.weightedAcu)} />
              <Stat label="总PV" value={formatInt(snapshot.livePv)} />
              <Stat label="过审总时长" value={formatDuration(snapshot.passedLiveDuration)} />
              <Stat label="有效直播天数" value={`${snapshot.validLiveDays} 天`} />
            </dl>
            {showPvShare ? (
              <ShareDonut
                ratio={snapshot.livePv / (pools.livePvPool ?? 1)}
                caption="我的直播 PV 占比"
                mine={formatInt(snapshot.livePv)}
                poolLabel={`加权ACU* 低于 ${ACU_THRESHOLD} 的创作者总 PV`}
              />
            ) : null}
          </div>

          <div className="mt-4 border-t border-brand/12 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-brand">直播日历</h3>
            <LiveCalendar days={liveDays} validDays={snapshot.validLiveDays} />
            <p className="mt-2 text-xs text-ink-soft/85">
              有效直播日：单日过审时长累计超过 1 小时，共 {passedLives.length} 场过审直播。
            </p>
          </div>
        </Panel>
      ) : null}

      {snapshot.hasVideo ? (
        <Panel title="视频数据" className="rise-fade">
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="视频过审数量" value={formatInt(snapshot.passedVideoCount)} />
              <Stat label="视频过审播放" value={formatInt(snapshot.playCount)} />
            </dl>
            {showPlayShare ? (
              <ShareDonut
                ratio={snapshot.playCount / (pools.playPool ?? 1)}
                caption="我的播放量占比"
                mine={formatInt(snapshot.playCount)}
                poolLabel={`总播放低于 ${formatInt(PLAY_THRESHOLD)} 的创作者`}
              />
            ) : null}
          </div>
        </Panel>
      ) : null}

      <PendingTabs videos={pendingVideos} lives={pendingLives} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand/12 bg-white/55 px-3 py-2.5">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
