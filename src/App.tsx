import { useCallback, useEffect, useRef, useState } from "react";
import { ACU_THRESHOLD, PLAY_THRESHOLD, fetchLivePvBelowAcu, fetchPeriods, fetchPlayBelowTotal, searchByKey } from "./lib/api";
import { buildResult, type QueryResult, type QuerySnapshot } from "./lib/metrics";
import { celebrate, diffSnapshot, type TrackedMetric } from "./lib/celebrate";
import { loadCreators, loadForm, loadSnapshot, saveCreator, saveForm, saveSnapshot, type SavedCreator } from "./lib/storage";
import type { ProjectPeriod } from "./lib/types";
import { HeroBanner, Panel } from "./components/Frame";
import { SearchForm } from "./components/SearchForm";
import { EmptyState } from "./components/EmptyState";
import { ResultView, type PoolTotals } from "./components/ResultView";

type Phase = "idle" | "empty" | "result";

export function App() {
  const [periods, setPeriods] = useState<ProjectPeriod[]>([]);
  const [activityPeriodId, setActivityPeriodId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [savedCreators, setSavedCreators] = useState<SavedCreator[]>(loadCreators);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [previous, setPrevious] = useState<QuerySnapshot | null>(null);
  const [grown, setGrown] = useState<TrackedMetric[]>([]);
  const [pools, setPools] = useState<PoolTotals>({ playPool: null, livePvPool: null });
  const restored = useRef(false);

  useEffect(() => {
    const cached = loadForm();
    if (cached) {
      setKeyword(cached.key);
      setActivityPeriodId(cached.activityPeriodId);
    }

    fetchPeriods()
      .then(list => {
        setPeriods(list);
        setActivityPeriodId(current =>
          current !== null && list.some(item => item.activity_period_id === current)
            ? current
            : (list[0]?.activity_period_id ?? null),
        );
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => {
        restored.current = true;
      });
  }, []);

  useEffect(() => {
    if (restored.current) saveForm({ key: keyword, activityPeriodId });
  }, [keyword, activityPeriodId]);

  const runQuery = useCallback(async () => {
    const key = keyword.trim();
    if (!key || activityPeriodId === null || loading) return;

    setLoading(true);
    setError(null);
    setGrown([]);
    setPools({ playPool: null, livePvPool: null });

    try {
      const response = await searchByKey(activityPeriodId, key);
      const period = periods.find(item => item.activity_period_id === activityPeriodId)?.period ?? "";
      const next = buildResult(response, { key, activityPeriodId, period });

      if (next.empty) {
        setResult(null);
        setPhase("empty");
        return;
      }

      const creatorName = next.videos.map(video => video.author_name).find(name => name?.trim())
        ?? next.lives.map(live => live.anchor_name).find(name => name?.trim());
      if (creatorName) setSavedCreators(saveCreator({ name: creatorName, key }));

      // 首次查询没有缓存，按全 0 处理，因此任何数据都会触发增长反馈。
      const cachedSnapshot = loadSnapshot(key, activityPeriodId);
      const grownFields = diffSnapshot(next.snapshot, cachedSnapshot);

      setPrevious(cachedSnapshot);
      setResult(next);
      setPhase("result");
      setGrown(grownFields);
      saveSnapshot(next.snapshot);
      celebrate(grownFields.length);

      const needPlayPool = next.snapshot.playCount > 0 && next.snapshot.playCount < PLAY_THRESHOLD;
      const needPvPool = next.snapshot.weightedAcu > 0 && next.snapshot.weightedAcu < ACU_THRESHOLD;

      const [playPool, livePvPool] = await Promise.all([
        needPlayPool
          ? fetchPlayBelowTotal(activityPeriodId)
              .then(res => res.summary?.total_play_count ?? null)
              .catch(() => null)
          : Promise.resolve(null),
        needPvPool
          ? fetchLivePvBelowAcu(activityPeriodId)
              .then(res => res.summary?.total_live_exposure_pv ?? null)
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      setPools({ playPool, livePvPool });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "查询失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [keyword, activityPeriodId, loading, periods]);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-5 sm:py-8">
      <div className="space-y-4">
        <Panel className="space-y-4">
          <HeroBanner />
          <header className="text-center">
            <h1 className="font-display text-3xl tracking-wide text-brand sm:text-4xl">
              万国觉醒执政官创作营
            </h1>
          </header>
          <SearchForm
            value={keyword}
            savedCreators={savedCreators}
            periods={periods}
            activityPeriodId={activityPeriodId}
            loading={loading}
            onValueChange={setKeyword}
            onPeriodChange={setActivityPeriodId}
            onSubmit={runQuery}
          />
          {error ? (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </Panel>

        {phase === "idle" ? <EmptyState searched={false} /> : null}
        {phase === "empty" ? <EmptyState searched={true} /> : null}
        {phase === "result" && result ? (
          <ResultView result={result} previous={previous} grown={grown} pools={pools} />
        ) : null}
      </div>
    </main>
  );
}

export default App;
