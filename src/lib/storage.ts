import type { QuerySnapshot } from "./metrics";

const FORM_KEY = "rok-my-data/form";
const SNAPSHOT_KEY = "rok-my-data/snapshot";
const CREATORS_KEY = "rok-my-data/creators";

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

export const loadForm = () => read<FormCache>(FORM_KEY);
export const saveForm = (value: FormCache) => write(FORM_KEY, value);

/** 成功查到的创作者按 key 去重，最近查询的排在前面。 */
export function loadCreators(): SavedCreator[] {
  const saved = read<unknown>(CREATORS_KEY);
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

export function saveCreator(creator: SavedCreator): SavedCreator[] {
  const name = creator.name.trim();
  const key = creator.key.trim();
  if (!name || !key) return loadCreators();
  const saved = [{ name, key }, ...loadCreators().filter(item => item.key !== key)];
  write(CREATORS_KEY, saved);
  return saved;
}

/** 快照按 key + 期次分别缓存，便于跨期对比。 */
const snapshotId = (key: string, activityPeriodId: number) => `${activityPeriodId}::${key}`;

export function loadSnapshot(key: string, activityPeriodId: number): QuerySnapshot | null {
  const all = read<Record<string, QuerySnapshot>>(SNAPSHOT_KEY) ?? {};
  return all[snapshotId(key, activityPeriodId)] ?? null;
}

export function saveSnapshot(snapshot: QuerySnapshot) {
  const all = read<Record<string, QuerySnapshot>>(SNAPSHOT_KEY) ?? {};
  all[snapshotId(snapshot.key, snapshot.activityPeriodId)] = snapshot;
  write(SNAPSHOT_KEY, all);
}
