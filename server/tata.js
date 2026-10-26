const PASSED = "审核通过";
export function tagsOf(row) {
  let value = row.extra_tag ?? row.audit_extra?.extra_tag;
  if (value && typeof value === "object" && !Array.isArray(value)) value = value.value;
  return Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[,，、;；\s]+/).filter(Boolean) : [];
}

export function ranking(values) {
  const sorted = values.filter(value => value > 0).sort((a, b) => b - a);
  return { participants: sorted.length, cutoffs: [3, 10, 30].map(top => ({ top, value: sorted[Math.min(top, sorted.length) - 1] ?? null })) };
}

// Never return other creators' identities, keys or content from this aggregate.
export function aggregateTata(videos, lives) {
  const passedVideos = videos.filter(row => row.audit_result?.trim() === PASSED);
  const passedLives = lives.filter(row => row.audit_result?.trim() === PASSED);
  const videoPool = rows => {
    const users = new Map();
    let total = 0;
    for (const row of rows) {
      const play = row.latest_play_count ?? row.latest_metric?.play_count ?? 0;
      total += play;
      if (row.author_uid) users.set(row.author_uid, (users.get(row.author_uid) ?? 0) + play);
    }
    return { total, ...ranking([...users.values()]) };
  };
  const anchors = new Map();
  let totalLivePv = 0;
  for (const row of passedLives) {
    totalLivePv += row.live_exposure_pv ?? 0;
    if (!row.anchor_uid) continue;
    const user = anchors.get(row.anchor_uid) ?? { pv: 0, seconds: 0, acuSeconds: 0, weighted: 0, days: new Map() };
    const seconds = Math.max(0, row.live_duration_seconds ?? 0);
    user.pv += row.live_exposure_pv ?? 0;
    user.seconds += seconds;
    if (seconds > 0 && row.acu != null) {
      user.acuSeconds += seconds;
      user.weighted += row.acu * seconds;
    }
    const date = row.start_time?.slice(0, 10);
    if (date) user.days.set(date, (user.days.get(date) ?? 0) + seconds);
    anchors.set(row.anchor_uid, user);
  }
  const users = [...anchors.values()];
  const eligible = users.filter(user => [...user.days.values()].filter(seconds => seconds > 3600).length >= 15 && user.seconds >= 45 * 3600 && user.pv >= 20000);
  return {
    video: videoPool(passedVideos),
    strategy: videoPool(passedVideos.filter(row => tagsOf(row).includes("攻略"))),
    creative: videoPool(passedVideos.filter(row => tagsOf(row).includes("二创"))),
    live: { total: totalLivePv, ...ranking(users.map(user => user.pv)) },
    acu: ranking(users.filter(user => user.acuSeconds > 0).map(user => user.weighted / user.acuSeconds)),
    eligibleLive: { total: eligible.reduce((sum, user) => sum + user.pv, 0), participants: eligible.length },
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchTataPools(periodId, upstream) {
  const projects = await upstream("/api/v1/queries/projects");
  if (!projects.some(row => row.project_id === 3 && row.activity_period_id === periodId)) throw new Error("期数不属于塔塔项目");
  const configs = await upstream("/api/v1/queries/contents");
  const ids = [...new Set(configs.filter(row => row.activity_period_id === periodId).map(row => row.content_config_id))];
  const fetchVideos = async id => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await upstream(`/api/v1/queries/videos/with-metrics?content_config_id=${id}&metrics_mode=latest&limit=500&offset=${offset}`);
      if (!Array.isArray(page)) throw new Error("视频数据格式异常");
      rows.push(...page);
      if (page.length < 500) return rows;
      if (offset >= 100000) throw new Error("视频数据量过大，请稍后重试");
    }
  };
  const fetchLives = async () => {
    const rows = [];
    let cursor;
    for (;;) {
      const query = new URLSearchParams({ activity_period_id: String(periodId), limit: "500" });
      if (cursor) query.set("cursor", cursor);
      const page = await upstream(`/api/v1/queries/v2/live-sessions?${query}`);
      if (!Array.isArray(page.data) || !page.meta) throw new Error("直播数据格式异常");
      rows.push(...page.data);
      if (!page.meta.has_more) return rows;
      if (!page.meta.next_cursor || page.meta.next_cursor === cursor || rows.length > 100000) throw new Error("直播分页数据不完整");
      cursor = page.meta.next_cursor;
    }
  };
  const [videoPages, lives] = await Promise.all([Promise.all(ids.map(fetchVideos)), fetchLives()]);
  return aggregateTata(videoPages.flat(), lives);
}
