import type { Project } from "./lib/projects";
import { activityFromSearch } from "./lib/projects";
import { fetchTataPools, type TataPools } from "./lib/tata";
import { TataEmpty, TataResultView } from "./components/TataResultView";
import { useCallback, useEffect, useRef, useState } from "react";
import { ACU_THRESHOLD, PLAY_THRESHOLD, fetchLivePvBelowAcu, fetchPeriods, fetchPlayBelowTotal, searchByKey } from "./lib/api";
import { buildResult, type QueryResult, type QuerySnapshot } from "./lib/metrics";
import { celebrate, diffSnapshot, type TrackedMetric } from "./lib/celebrate";
import { loadCreators, loadForm, loadSnapshot, saveCreator, saveForm, saveSnapshot, type SavedCreator } from "./lib/storage";
import type { ProjectPeriod } from "./lib/types";
import { HeroBanner, Panel } from "./components/Frame";
import { SearchForm } from "./components/SearchForm";
import { EmptyState } from "./components/EmptyState";
import { TataSearchForm } from "./components/TataSearchForm";
import { TataLoading } from "./components/TataLoading";
import { TataNotice } from "./components/TataNotice";
import { TataWatermark } from "./components/TataWatermark";
import { TataSupport } from "./components/TataSupport";
import { loadPeriods, savePeriods, loadTataQuery, saveTataQuery } from "./lib/storage";
import { ResultView, type PoolTotals } from "./components/ResultView";

type Phase = "idle" | "empty" | "result";

export function QueryPage({ project }: { project: Project }) {
  const isTata = project.id === 3;
  const [periods, setPeriods] = useState<ProjectPeriod[]>(() => loadPeriods(project.id));
  const [activityPeriodId, setActivityPeriodId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [savedCreators, setSavedCreators] = useState<SavedCreator[]>(() => loadCreators(project.id));
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("查询创作成果");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [previous, setPrevious] = useState<QuerySnapshot | null>(null);
  const [grown, setGrown] = useState<TrackedMetric[]>([]);
  const [pools, setPools] = useState<PoolTotals>({ playPool: null, livePvPool: null });
  const restored = useRef(false);
  const [tataPools, setTataPools] = useState<TataPools | null>(null);
  const [poolError, setPoolError] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const Form = isTata ? TataSearchForm : SearchForm;

  useEffect(() => {
    const cached = loadForm(project.id);
    const linkedPeriod = isTata ? activityFromSearch(window.location.search) : null;
    const initialPeriod = linkedPeriod ?? cached?.activityPeriodId ?? null;
    setActivityPeriodId(initialPeriod);
    if (cached) {
      setKeyword(cached.key);
      if (isTata && initialPeriod !== null) {
        const query = loadTataQuery(cached.key, initialPeriod);
        if (query) {
          const restoredResult = buildResult(query.response, { key: query.key, activityPeriodId: query.activityPeriodId, period: query.period });
          restoredResult.snapshot.updatedAt = query.updatedAt;
          setResult(restoredResult);
          setTataPools(query.pools);
          setPhase(restoredResult.empty ? "empty" : "result");
        }
      }
    }

    fetchPeriods(project.id)
      .then(list => {
        setPeriods(list);
        savePeriods(list, project.id);
        if (initialPeriod != null && !list.some(item => item.activity_period_id === initialPeriod)) {
          setResult(null); setTataPools(null); setPhase("idle");
          if (linkedPeriod !== null) setError("指定期数不可用，请重新选择。");
        }
        if (list.length === 0) setError("当前项目暂无可查询期数");
        setActivityPeriodId(current =>
          current !== null && list.some(item => item.activity_period_id === current)
            ? current
            : (list[0]?.activity_period_id ?? null),
        );
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => {
        restored.current = true;
        setPeriodsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (restored.current) saveForm({ key: keyword, activityPeriodId }, project.id);
  }, [keyword, activityPeriodId]);

  const runQuery = useCallback(async () => {
    const key = keyword.trim();
    if (!key || activityPeriodId === null || loading) return;

    setLoading(true);
    setLoadingStage("查询创作成果");
    if (!isTata) { setResult(null); setPhase("idle"); }
    setError(null);
    setGrown([]);
    setTataPools(null);
    setPoolError(false);
    setPools({ playPool: null, livePvPool: null });

    try {
      const response = await searchByKey(activityPeriodId, key, project.id);
      const period = periods.find(item => item.activity_period_id === activityPeriodId)?.period ?? "";
      const next = buildResult(response, { key, activityPeriodId, period });

      if (next.empty) {
        if (isTata) saveTataQuery({ key, activityPeriodId, period, response, pools: null, updatedAt: Date.now() });
        setResult(null);
        setPhase("empty");
        return;
      }

      const creatorName = next.videos.map(video => video.author_name).find(name => name?.trim())
        ?? next.lives.map(live => live.anchor_name).find(name => name?.trim());
      if (creatorName) setSavedCreators(saveCreator({ name: creatorName, key }, project.id));

      // 首次查询没有缓存，按全 0 处理，因此任何数据都会触发增长反馈。
      const cachedSnapshot = loadSnapshot(key, activityPeriodId, project.id);
      const grownFields = diffSnapshot(next.snapshot, cachedSnapshot);

      setPrevious(cachedSnapshot);
      setResult(next);
      setPhase("result");
      setGrown(grownFields);
      saveSnapshot(next.snapshot, project.id);
      celebrate(grownFields.length);

      if (isTata) {
        setLoadingStage("汇总活动占比");
        const cachedQuery = { key, activityPeriodId, period, response, pools: null, updatedAt: next.snapshot.updatedAt };
        saveTataQuery(cachedQuery);
        try {
          const totals = await fetchTataPools(activityPeriodId);
          setTataPools(totals);
          saveTataQuery({ ...cachedQuery, pools: totals });
        } catch { setPoolError(true); }
        return;
      }
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
  }, [keyword, activityPeriodId, loading, periods, project.id, isTata]);

  return (
    <main className={`mx-auto w-full max-w-3xl px-3 py-5 sm:px-5 sm:py-8 ${isTata ? "tata-page" : ""}`}>
      {isTata && result ? <TataWatermark name={result.videos.find(row => row.author_name)?.author_name ?? result.lives.find(row => row.anchor_name)?.anchor_name} /> : null}
      {isTata && loading ? <TataLoading stage={loadingStage} /> : null}
      <div className={`space-y-4 ${isTata ? "tata-content" : ""}`}>
        <Panel className={`space-y-4 ${isTata ? "tata-search-panel" : ""}`}>
          {isTata ? <h1 className="sr-only">塔塔冒险队激励计划 · 活动查询</h1> : <HeroBanner />}
          {!isTata ? <header className="text-center">
            <h1 className="font-display text-3xl tracking-wide text-brand sm:text-4xl">
              万国觉醒执政官创作营
            </h1>
          </header> : null}
          <Form
            value={keyword}
            savedCreators={savedCreators}
            periods={periods}
            periodsLoading={periodsLoading}
            credentialLabel={isTata ? "创作者 ID" : "创作营密钥"}
            activityPeriodId={activityPeriodId}
            loading={loading}
            onValueChange={setKeyword}
            onPeriodChange={id => {
              setActivityPeriodId(id); setResult(null); setPhase("idle"); setTataPools(null); setError(null);
              if (isTata) {
                const url = new URL(window.location.href);
                url.searchParams.set("act", String(id));
                window.history.replaceState(null, "", url);
              }
            }}
            onSubmit={runQuery}
          />
          {error ? (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </Panel>
        {isTata ? <TataSupport /> : null}

        {phase === "idle" && !isTata ? <EmptyState searched={false} /> : null}
        {phase === "empty" ? (isTata ? <TataEmpty searched /> : <EmptyState searched={true} />) : null}
        {phase === "result" && result ? (
          isTata ? <TataResultView key={result.snapshot.updatedAt} result={result} pools={tataPools} poolError={poolError} loading={loading} /> : <ResultView result={result} previous={previous} grown={grown} pools={pools} />
        ) : null}
        {isTata ? <TataNotice /> : null}
      </div>
    </main>
  );
}
