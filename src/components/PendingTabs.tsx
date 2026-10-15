import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { LiveRow, VideoRow } from "../lib/types";
import { auditStage } from "../lib/metrics";
import { formatDateTime, formatDuration, truncateTitle, videoUrl } from "../lib/format";

const PAGE_SIZES = [10, 20, 50];

/** 待审核 / 审核不通过 状态标签。 */
function StageBadge({ auditResult }: { auditResult: string | null | undefined }) {
  const stage = auditStage(auditResult);
  if (stage === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        待审核
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2 py-0.5 text-xs font-medium text-rose-700">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      未通过
    </span>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand underline decoration-brand-soft decoration-dotted underline-offset-2 transition hover:text-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </a>
  );
}

/** 未过审明细：视频 / 直播两个 Tab，待审核的记录排在前面。 */
export function PendingTabs({ videos, lives }: { videos: VideoRow[]; lives: LiveRow[] }) {
  const tabs = useMemo(
    () =>
      [
        { id: "video" as const, label: "视频未过审", count: videos.length, enabled: videos.length > 0 },
        { id: "live" as const, label: "直播未过审", count: lives.length, enabled: lives.length > 0 },
      ].filter(tab => tab.enabled),
    [videos.length, lives.length],
  );

  const [active, setActive] = useState<"video" | "live">(tabs[0]?.id ?? "video");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]!);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(tab => tab.id === active)) setActive(tabs[0]!.id);
  }, [tabs, active]);

  useEffect(() => setPage(1), [active, pageSize]);

  if (tabs.length === 0) return null;

  const total = active === "video" ? videos.length : lives.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;

  return (
    <section className="panel overflow-hidden pending-details">
      <div role="tablist" aria-label="未过审明细" className="flex border-b border-brand/15">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={clsx(
              "flex-1 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
              active === tab.id ? "bg-brand text-parchment" : "text-ink-soft hover:bg-brand/8",
            )}
          >
            {tab.label}
            <span className="ml-1 tabular-nums opacity-80">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {active === "video" ? (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-parchment-deep/70 text-xs text-ink-soft">
              <tr>
                <Th>标题</Th>
                <Th>状态</Th>
                <Th>未过审原因</Th>
                <Th className="text-right">视频链接</Th>
              </tr>
            </thead>
            <tbody>
              {videos.slice(start, start + pageSize).map(video => {
                const stage = auditStage(video.audit_result);
                return (
                  <tr key={video.video_id} className="border-t border-brand/10">
                    <Td label="标题" title={video.title ?? undefined}>{truncateTitle(video.title)}</Td>
                    <Td label="状态"><StageBadge auditResult={video.audit_result} /></Td>
                    <Td label="未过审原因" className="text-ink-soft">
                      {stage === "pending" ? "审核中，请耐心等待" : (video.label ?? "—")}
                    </Td>
                    <Td label="视频链接" className="text-right">
                      <ExternalLink href={videoUrl(video.video_id)}>点击查看</ExternalLink>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-parchment-deep/70 text-xs text-ink-soft">
              <tr>
                <Th>开播时间</Th>
                <Th>开播时长</Th>
                <Th>状态</Th>
                <Th>未过审原因</Th>
              </tr>
            </thead>
            <tbody>
              {lives.slice(start, start + pageSize).map(live => {
                const stage = auditStage(live.audit_result);
                return (
                  <tr key={live.live_room_id} className="border-t border-brand/10">
                    <Td label="开播时间" className="tabular-nums">{formatDateTime(live.start_time)}</Td>
                    <Td label="开播时长" className="tabular-nums">{formatDuration(live.live_duration_seconds)}</Td>
                    <Td label="状态"><StageBadge auditResult={live.audit_result} /></Td>
                    <Td label="未过审原因" className="text-ink-soft">
                      {stage === "pending" ? "审核中，请耐心等待" : (live.label ?? "—")}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand/12 px-4 py-2.5 text-xs text-ink-soft">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <PageButton label="上一页" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</PageButton>
          <span className="min-w-14 text-center tabular-nums">{currentPage} / {pageCount}</span>
          <PageButton label="下一页" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>›</PageButton>
          <label className="ml-1">
            <span className="sr-only">每页条数</span>
            <select
              value={pageSize}
              onChange={event => setPageSize(Number(event.target.value))}
              className="rounded-md border border-brand/20 bg-white/70 px-2 py-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {PAGE_SIZES.map(size => (
                <option key={size} value={size}>{size} 条/页</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function Th({ children, className }: { children: string; className?: string }) {
  return <th scope="col" className={clsx("px-4 py-2 font-medium", className)}>{children}</th>;
}

function Td({ children, className, title, label }: { children: React.ReactNode; className?: string; title?: string; label?: string }) {
  return <td title={title} data-label={label} className={clsx("px-4 py-2.5", className)}>{children}</td>;
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-brand/20 text-brand transition enabled:hover:bg-brand/10 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </button>
  );
}
