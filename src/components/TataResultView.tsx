import { useRef } from "react";
import { useTataMotion } from "../lib/useTataMotion";
import { Panel } from "./Frame";
import { MetricCard } from "./MetricCard";
import { TataCalendar } from "./TataCalendar";
import { TataPending } from "./TataPending";
import { aggregateLiveDays, isPassed, type QueryResult } from "../lib/metrics";
import { hasTag, type RankingPool, type TataPools } from "../lib/tata";
import { formatAcu, formatDuration, formatInt } from "../lib/format";

const compact = (value: number) => value >= 10000 ? `${(value / 10000).toFixed(1).replace(/\.0$/, "")}万` : formatInt(value);

export function TataEmpty({ searched = false }: { searched?: boolean }) {
  return <Panel className="tata-intro"><h2>{searched ? "暂未查询到数据" : "每一份创作，都有迹可循"}</h2><p>{searched ? "请检查创作者 ID 和活动期数后重新查询。" : "选择活动期数，输入创作者 ID。"}</p></Panel>;
}

function RankAward({ value, pool, singleUser, metric = "播放量" }: { value: number; pool?: RankingPool; singleUser: boolean; metric?: string }) {
  if (!singleUser || !pool || value <= 0 || pool.participants === 0) return null;
  const band = pool.cutoffs.find(item => item.value !== null && value >= item.value);
  if (!band) return <p className="rank-band">{metric} · 30 名以后</p>;
  return <div className="tata-rank-award"><svg className="tata-rank-medal" viewBox="0 0 80 92" aria-hidden="true"><path d="M22 51 16 86 31 79 40 88 44 54" fill="#c2a2ed" /><path d="m43 52 8 36 10-9 14 5-14-35" fill="#a983dc" /><path d="M40 7C48 1 56 6 58 13c9-1 16 7 13 15 8 5 8 15 1 21 3 9-4 17-13 16-3 9-13 12-20 6-8 6-17 2-20-6-10 1-16-8-12-17-7-7-5-17 3-21-2-9 5-16 14-15C27 5 34 3 40 7Z" fill="#ffe58d" stroke="#b37b35" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="40" cy="38" r="23" fill="#fff4c4" /><path d="m22 23 7-5" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><text x="40" y="48" textAnchor="middle" fill="#8b5b25" fontFamily="var(--font-tata-display)" fontSize="28">{band.top}</text><path d="m65 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#b59be1" /></svg><div><span>{metric}</span><div className="tata-rank-line"><strong>前 {band.top} 名区间</strong><small>含并列</small></div></div></div>;
}

function Share({ mine, total, label }: { mine: number; total?: number; label: string }) {
  if (mine <= 0 || total === 0) return null;
  const ratio = total && total > 0 ? mine / total : 0;
  const percent = ratio > 0 && ratio < 0.01 ? "不足 1%" : `约 ${Math.round(ratio * 100)}%`;
  return <div className="tata-share"><p>{label}</p><div className="tata-share-visual"><div className="tata-drawn-meter"><span className="tata-meter-cap" aria-hidden><img src="/tata/star.png" alt="" /></span><div className="tata-meter-well"><span className="tata-meter-fill" aria-hidden style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, minWidth: ratio > 0 ? "5px" : "0" }} /><strong>{total === undefined ? "—" : percent}</strong></div></div></div></div>;
}

export function TataResultView({ result, pools, poolError, loading }: { result: QueryResult; pools: TataPools | null; poolError: boolean; loading: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useTataMotion(root, !loading, pools);
  const { snapshot: s, passedLives, liveDays } = result;
  const passedVideos = result.videos.filter(isPassed);
  const videoGroups = [
    { id: "strategy", tag: "攻略", title: "塔塔攻略悬赏", pool: pools?.strategy },
    { id: "creative", tag: "二创", title: "塔塔创意乐园", pool: pools?.creative },
  ];
  const visibleVideoGroups = videoGroups.map(group => {
    const rows = passedVideos.filter(row => hasTag(row, group.tag));
    return { ...group, rows, play: rows.reduce((sum, row) => sum + (row.latest_metric?.play_count ?? 0), 0), users: new Set(rows.map(row => row.author_uid).filter(Boolean)) };
  }).filter(group => group.play > 0);
  const liveUids = new Set(passedLives.map(row => row.anchor_uid).filter(Boolean));
  const eligiblePv = [...liveUids].reduce((total, uid) => {
    const lives = passedLives.filter(row => row.anchor_uid === uid);
    const seconds = lives.reduce((sum, row) => sum + (row.live_duration_seconds ?? 0), 0);
    const pv = lives.reduce((sum, row) => sum + (row.live_exposure_pv ?? 0), 0);
    const days = [...aggregateLiveDays(lives).values()].filter(day => day.valid).length;
    return total + (days >= 15 && seconds >= 45 * 3600 && pv >= 20000 ? pv : 0);
  }, 0);
  const author = result.videos.find(row => row.author_name)?.author_name ?? result.lives.find(row => row.anchor_name)?.anchor_name;
  return <div ref={root} className="space-y-5 tata-results" aria-busy={loading}>
    <header className="tata-result-head"><p>{s.period} · 创作成果</p><h2>{author ?? "我的活动数据"}</h2></header>
    <div className="grid grid-cols-4 gap-1.5 sm:gap-3 tata-metric-grid">
      {s.playCount > 0 ? <MetricCard label="视频播放" value={s.playCount} display={compact(s.playCount)} previous={null} /> : null}
      {result.videos.length > 0 ? <MetricCard label="过审视频" value={s.passedVideoCount} display={`${s.passedVideoCount}/${result.videos.length}`} previous={null} /> : null}
      {s.livePv > 0 ? <MetricCard label="直播场观" value={s.livePv} display={compact(s.livePv)} previous={null} /> : null}
      {s.weightedAcu > 0 ? <MetricCard label="加权 ACU" value={s.weightedAcu} display={formatAcu(s.weightedAcu)} previous={null} /> : null}
    </div>
    {poolError ? <p role="alert" className="pool-status">活动汇总加载失败，请重试。</p> : null}
    {visibleVideoGroups.length > 0 ? <Panel className="tata-video-combined"><div className="tata-video-columns" style={{ gridTemplateColumns: `repeat(${visibleVideoGroups.length}, minmax(0, 1fr))` }}>
      {visibleVideoGroups.map(group => <section key={group.id} className={`tata-category tata-category-${group.id}`}>
        <h3>{group.title}</h3>
        <RankAward value={group.play} pool={group.pool} singleUser={group.users.size === 1} />
        <div className="tata-video-data"><p className="tata-label">过审播放量</p><p className="tata-number">{formatInt(group.play)}</p><p>{group.rows.length} 篇过审作品</p></div>
        <Share mine={group.play} total={group.pool?.total} label="播放量占比" />
      </section>)}
    </div></Panel> : null}
    {s.livePv > 0 || s.weightedAcu > 0 || s.passedLiveCount > 0 ? <Panel title="直播数据" className="tata-category tata-category-live">
      <div className="tata-live-columns">
        {s.weightedAcu > 0 ? <section className="tata-live-feature"><h3>直播人气</h3><RankAward value={s.weightedAcu} pool={pools?.acu} singleUser={liveUids.size === 1} metric="加权 ACU" /><div className="tata-live-data"><p className="tata-number">{formatAcu(s.weightedAcu)}</p><p className="tata-label">加权 ACU</p></div></section> : null}
        {s.livePv > 0 ? <section className="tata-live-feature"><h3>直播场观</h3><div className="tata-live-data"><p className="tata-number">{compact(s.livePv)}</p><p className="tata-label">我的场观 PV</p></div><Share mine={s.livePv} total={pools?.live.total} label="活动场观占比" /></section> : null}
      </div>
      <dl className="tata-live-stats">
        {s.passedLiveCount > 0 ? <div><dd>{s.passedLiveCount}<small>场</small></dd><dt>过审场次</dt></div> : null}
        {s.validLiveDays > 0 ? <div><dd>{s.validLiveDays}<small>天</small></dd><dt>有效天数</dt></div> : null}
        {s.passedLiveDuration > 0 ? <div><dd>{formatDuration(s.passedLiveDuration)}</dd><dt>直播时长</dt></div> : null}
      </dl>
      {eligiblePv > 0 ? <div className="tata-qualified"><h3>达标主播场观占比</h3><p>≥15 天 · ≥45 小时 · 场观 ≥20,000</p><Share mine={eligiblePv} total={pools?.eligibleLive.total} label="达标场观占比" /></div> : null}
      {passedLives.length > 0 ? <TataCalendar days={liveDays} validDays={s.validLiveDays} /> : null}
    </Panel> : null}
    <TataPending videos={result.pendingVideos} lives={result.pendingLives} />
  </div>;
}
