import type { QuerySnapshot } from "./metrics";
import type { ProjectPeriod, SearchResponse } from "./types";
import type { TataPools } from "./tata";

const FORM_KEY = "rok-my-data/form";
const SNAPSHOT_KEY = "rok-my-data/snapshot";
const CREATORS_KEY = "rok-my-data/creators";

const scoped = (key: string, projectId: number) => projectId === 1 ? key : `${key}/project-${projectId}`;

export interface FormCache {
  key: string;
  activityPeriodId: number | null;
}

export interface SavedCreator {
  name: string;
  key: string;
}

function read<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storageKey: string, value: unknown) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* 隐私模式下忽略写入失败 */
  }
}

export const loadForm = (projectId = 1) => read<FormCache>(scoped(FORM_KEY, projectId));
export const saveForm = (value: FormCache, projectId = 1) => write(scoped(FORM_KEY, projectId), value);

export const loadPeriods = (projectId: number) => {
  const saved = read<ProjectPeriod[]>(scoped("rok-my-data/periods", projectId));
  return Array.isArray(saved) ? saved.filter(item => item.project_id === projectId && Number.isSafeInteger(item.activity_period_id)) : [];
};
export const savePeriods = (periods: ProjectPeriod[], projectId: number) => write(scoped("rok-my-data/periods", projectId), periods);

export interface TataQueryCache {
  key: string;
  activityPeriodId: number;
  period: string;
  response: SearchResponse;
  pools: TataPools | null;
  updatedAt: number;
}
export function loadTataQuery(key: string, activityPeriodId: number): TataQueryCache | null {
  const all = read<TataQueryCache[]>("tata-my-data/results");
  if (!Array.isArray(all)) return null;
  return all.find(item => item?.key === key && item.activityPeriodId === activityPeriodId && Array.isArray(item.response?.videos?.data) && Array.isArray(item.response?.live_sessions?.data)) ?? null;
}
export function saveTataQuery(value: TataQueryCache) {
  const saved = read<TataQueryCache[]>("tata-my-data/results");
  const all = Array.isArray(saved) ? saved : [];
  write("tata-my-data/results", [value, ...all.filter(item => item?.key !== value.key || item.activityPeriodId !== value.activityPeriodId)].slice(0, 5));
}

/** 成功查到的创作者按 key 去重，最近查询的排在前面。 */
export function loadCreators(projectId = 1): SavedCreator[] {
  const saved = read<unknown>(scoped(CREATORS_KEY, projectId));
  if (!Array.isArray(saved)) return [];
  return saved.filter(
    (item): item is SavedCreator =>
      typeof item === "object" &&
      item !== null &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      typeof item.key === "string" &&
      item.key.trim().length > 0,
  );
}

export function saveCreator(creator: SavedCreator, projectId = 1): SavedCreator[] {
  const name = creator.name.trim();
  const key = creator.key.trim();
  if (!name || !key) return loadCreators(projectId);
  const saved = [{ name, key }, ...loadCreators(projectId).filter(item => item.key !== key)];
  write(scoped(CREATORS_KEY, projectId), saved);
  return saved;
}

/** 快照按 key + 期次分别缓存，便于跨期对比。 */
const snapshotId = (key: string, activityPeriodId: number) => `${activityPeriodId}::${key}`;

export function loadSnapshot(key: string, activityPeriodId: number, projectId = 1): QuerySnapshot | null {
  const all = read<Record<string, QuerySnapshot>>(scoped(SNAPSHOT_KEY, projectId)) ?? {};
  return all[snapshotId(key, activityPeriodId)] ?? null;
}

export function saveSnapshot(snapshot: QuerySnapshot, projectId = 1) {
  const all = read<Record<string, QuerySnapshot>>(scoped(SNAPSHOT_KEY, projectId)) ?? {};
  all[snapshotId(snapshot.key, snapshot.activityPeriodId)] = snapshot;
  write(scoped(SNAPSHOT_KEY, projectId), all);
}
