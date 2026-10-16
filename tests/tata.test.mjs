import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { aggregateTata, fetchTataPools, ranking } from "../server/tata.js";
import handler from "../edge-functions/api/[[default]].js";

const passed = { audit_result: "审核通过" };
const video = (uid, play, tag, audit_result = "审核通过") => ({ author_uid: uid, latest_play_count: play, audit_extra: { extra_tag: tag }, audit_result });
const livesFor = (uid, days = 16, seconds = 10800, pv = 1500) => Array.from({ length: days }, (_, i) => ({ ...passed, anchor_uid: uid, start_time: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00`, live_duration_seconds: seconds, live_exposure_pv: pv, acu: i === 0 ? null : 10 }));
async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const outputText = stripTypeScriptTypes(source);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

test("categories use latest snapshots, only passed content and exact tags", () => {
  const p = aggregateTata([video("a", 100, "攻略"), video("a", 200, { type: "text", value: "攻略" }), video("b", 400, ["二创"]), video("c", 999, "攻略", "审核中"), video("d", 50, "其他")], []);
  assert.equal(p.video.total, 750);
  assert.equal(p.strategy.total, 300);
  assert.equal(p.creative.total, 400);
  assert.equal(p.strategy.participants, 1);
  assert.equal(JSON.stringify(p).includes("author_uid"), false);
});

test("qualification includes exact day/hour/PV boundaries and excludes any below threshold", () => {
  const rows = [...livesFor("equal", 15, 45 * 3600 / 15, 20000 / 15), ...livesFor("yes"), ...livesFor("days", 14), ...livesFor("hours", 16, (45 * 3600 - 1) / 16), ...livesFor("pv", 16, 10800, 19999 / 16), ...livesFor("pending").map(row => ({ ...row, audit_result: "审核中" }))];
  const p = aggregateTata([], rows);
  assert.equal(p.eligibleLive.participants, 2);
  assert.equal(Math.round(p.eligibleLive.total), 44000);
  assert.equal(Math.round(p.live.total), 20000 + 24000 + 21000 + 24000 + 19999);
  assert.equal(p.acu.cutoffs[0].value, 10);
});

test("rank cutoffs cover ties, fewer than N participants and empty pools", () => {
  assert.deepEqual(ranking([]).cutoffs.map(c => c.value), [null, null, null]);
  assert.deepEqual(ranking([100, 90, 90, 80, 0]).cutoffs.map(c => c.value), [90, 80, 80]);
});

test("server traverses every page, limits scope to project 3 period, and rejects broken cursors", async () => {
  const calls = [];
  const upstream = async path => {
    calls.push(path);
    if (path.endsWith("projects")) return [{ project_id: 3, activity_period_id: 30 }, { project_id: 1, activity_period_id: 10 }];
    if (path.endsWith("contents")) return [{ activity_period_id: 30, content_config_id: 31 }, { activity_period_id: 10, content_config_id: 11 }];
    if (path.includes("with-metrics")) return path.endsWith("offset=0") ? Array.from({ length: 500 }, () => video("a", 1, "攻略")) : [video("b", 10, "二创")];
    return { data: livesFor("a", 1), meta: { has_more: !path.includes("cursor="), next_cursor: "page2" } };
  };
  const p = await fetchTataPools(30, upstream);
  assert.equal(p.video.total, 510);
  assert.equal(p.live.total, 3000);
  assert.equal(calls.some(path => path.includes("content_config_id=11")), false);
  await assert.rejects(fetchTataPools(10, upstream), /期数不属于/);
  await assert.rejects(fetchTataPools(30, async path => path.includes("live-sessions") ? { data: [], meta: { has_more: true } } : upstream(path)), /分页数据不完整/);
});

test("creator search paginates video and live lists independently and sends the selected project", async () => {
  const { searchByKey } = await loadTs("../src/lib/api.ts");
  const original = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body); bodies.push(body);
    return new Response(JSON.stringify({ ok: true, videos: { data: body.offset === 0 ? Array.from({ length: 500 }, (_, i) => ({ video_id: String(i) })) : [{ video_id: "500" }], meta: { total: 501 } }, live_sessions: { data: body.offset === 0 ? [{ live_room_id: "a" }] : [], meta: { total: 1 } } }));
  };
  try {
    const result = await searchByKey(30, "test-only", 3);
    assert.equal(result.videos.data.length, 501);
    assert.equal(result.live_sessions.data.length, 1);
    assert.deepEqual(bodies.map(body => body.project_id), [3, 3]);
    assert.deepEqual(bodies.map(body => body.limit), [500, 500]);
  } finally { globalThis.fetch = original; }
});

test("ROK and Tata form, creators and snapshots are isolated while old ROK keys remain valid", async () => {
  const storage = await loadTs("../src/lib/storage.ts");
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  storage.saveForm({ key: "rok", activityPeriodId: 1 });
  storage.saveForm({ key: "tata", activityPeriodId: 30 }, 3);
  storage.saveCreator({ name: "R", key: "rok" });
  storage.saveCreator({ name: "T", key: "tata" }, 3);
  assert.equal(storage.loadForm().key, "rok");
  assert.equal(storage.loadForm(3).key, "tata");
  assert.equal(storage.loadCreators()[0].name, "R");
  assert.equal(storage.loadCreators(3)[0].name, "T");
  assert.equal(data.has("rok-my-data/form"), true);
  storage.saveSnapshot({ key: "same", activityPeriodId: 30, playCount: 100 }, 1);
  storage.saveSnapshot({ key: "same", activityPeriodId: 30, playCount: 200 }, 3);
  assert.equal(storage.loadSnapshot("same", 30, 1).playCount, 100);
  assert.equal(storage.loadSnapshot("same", 30, 3).playCount, 200);
});

test("effective live days sum passed sessions and require more than one hour", async () => {
  const { aggregateLiveDays } = await loadTs("../src/lib/metrics.ts");
  const two = [{ start_time: "2026-10-01T10:00:00", live_duration_seconds: 1800 }, { start_time: "2026-10-01T11:00:00", live_duration_seconds: 1800 }];
  assert.equal(aggregateLiveDays(two).get("2026-10-01").valid, false);
  assert.equal(aggregateLiveDays([...two, { start_time: "2026-10-01T12:00:00", live_duration_seconds: 1 }]).get("2026-10-01").valid, true);
});

test("missing ACU is excluded from weighted denominator and route resolution is exact", async () => {
  const { weightedAcu } = await loadTs("../src/lib/metrics.ts");
  assert.equal(weightedAcu([{ acu: null, live_duration_seconds: 3600 }, { acu: 10, live_duration_seconds: 3600 }, { acu: 30, live_duration_seconds: 7200 }]), 70 / 3);
  const { resolveProject } = await loadTs("../src/lib/projects.ts");
  assert.equal(resolveProject("/tata/").id, 3);
  assert.equal(resolveProject("/rok").id, 1);
  assert.equal(resolveProject("/unknown"), null);
  assert.equal(resolveProject("/", "?period=3&act=61").id, 3);
  assert.equal(resolveProject("/", "?period=1&act=10").id, 1);
  assert.equal(resolveProject("/").id, 1);
  assert.equal(resolveProject("/", "?period=unknown"), null);
  assert.equal(resolveProject("/rok", "?period=3").id, 1);
});

test("aggregate endpoint rejects invalid input and retains existing API method allowlist", async () => {
  const call = (path, method, body) => handler({ request: new Request(`https://local.test${path}`, { method, body }), env: { auth: "test-only" } });
  assert.equal((await call("/api/tata/pools", "GET")).status, 405);
  assert.equal((await call("/api/tata/pools", "POST", "{}")).status, 400);
  assert.equal((await call("/api/tata/pools", "POST", "broken")).status, 400);
  assert.equal((await call("/api/unknown", "GET")).status, 404);
});

test("act links accept only positive safe integer IDs", async () => {
  const { activityFromSearch } = await loadTs("../src/lib/projects.ts");
  assert.equal(activityFromSearch("?act=61"), 61);
  for (const value of ["", "?act=abc", "?act=1.5", "?act=-1", "?act=0", "?act=61x", "?act=9007199254740992"]) assert.equal(activityFromSearch(value), null);
});

test("query result cache is bounded and isolated by ID and period", async () => {
  const storage = await loadTs("../src/lib/storage.ts");
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const response = { videos: { data: [] }, live_sessions: { data: [] } };
  for (let i = 0; i < 6; i++) storage.saveTataQuery({ key: "id", activityPeriodId: i, response, pools: null });
  assert.equal(storage.loadTataQuery("id", 0), null);
  assert.equal(storage.loadTataQuery("id", 5).activityPeriodId, 5);
  assert.equal(storage.loadTataQuery("other", 5), null);
  storage.savePeriods([{ project_id: 3, activity_period_id: 61 }], 3);
  assert.equal(storage.loadPeriods(3)[0].activity_period_id, 61);
  assert.equal(storage.loadPeriods(1).length, 0);
});

