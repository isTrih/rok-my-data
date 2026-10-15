import { useState } from "react";
import type { LiveRow, VideoRow } from "../lib/types";
import { auditStage } from "../lib/metrics";
import { formatDateTime, formatDuration, videoUrl } from "../lib/format";

export function TataPending({ videos, lives }: { videos: VideoRow[]; lives: LiveRow[] }) {
  const [active, setActive] = useState<"video" | "live">(videos.length ? "video" : "live");
  const [page, setPage] = useState(0);
  if (!videos.length && !lives.length) return null;
  const rows = active === "video" ? videos : lives;
  const pages = Math.ceil(rows.length / 5);
  return <section className="tata-review">
    <header className="tata-review-heading"><h2><img src="/tata/star.png" alt="" />审核进度</h2><span>{videos.length + lives.length} 条待关注</span></header>
    <div className="tata-review-tabs" role="tablist" aria-label="未过审明细">
      {([["video", "视频", videos.length], ["live", "直播", lives.length]] as const).filter(([, , count]) => count > 0).map(([id, name, count]) => <button key={id} type="button" role="tab" aria-selected={active === id} aria-controls="tata-review-list" id={`review-${id}`} onClick={() => { setActive(id); setPage(0); }}>{name}未过审 <span>{count}</span></button>)}
    </div>
    <div id="tata-review-list" role="tabpanel" aria-labelledby={`review-${active}`} className="tata-review-list">
      {rows.slice(page * 5, page * 5 + 5).map((row, index) => {
        const pending = auditStage(row.audit_result) === "pending";
        const video = "video_id" in row ? row : null;
        const live = "live_room_id" in row ? row : null;
        return <article className="tata-review-item" key={video?.video_id ?? `${live?.live_room_id}-${live?.start_time}`}>
          <div className="tata-review-item-head"><span className="tata-review-index">{String(page * 5 + index + 1).padStart(2, "0")}</span><h3>{row.title || (video ? "视频作品" : "直播记录")}</h3><span className={`tata-review-status ${pending ? "is-pending" : "is-rejected"}`}>{pending ? "审核中" : "未通过"}</span></div>
          {live ? <p className="tata-review-meta">{formatDateTime(live.start_time)} · {formatDuration(live.live_duration_seconds)}</p> : null}
          <p className="tata-review-reason">{pending ? "请稍后查看结果" : row.label || "暂未提供审核原因"}</p>
          {video ? <a href={videoUrl(video.video_id)} target="_blank" rel="noopener noreferrer">查看作品 <span aria-hidden>↗</span></a> : null}
        </article>;
      })}
    </div>
    {pages > 1 ? <footer className="tata-review-pagination"><button type="button" aria-label="上一页" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button><span>{page + 1} / {pages}</span><button type="button" aria-label="下一页" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>›</button></footer> : null}
  </section>;
}
