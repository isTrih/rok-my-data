import { useMemo, useState } from "react";
import clsx from "clsx";
import type { LiveDayStat } from "../lib/metrics";
import { formatHours } from "../lib/format";

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/** 取北京时间当天日期字符串。 */
function beijingToday(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60_000);
  return `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, "0")}-${String(beijing.getDate()).padStart(2, "0")}`;
}

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * 直播日历：按中国时区聚合过审场次，有效直播日（单日 > 1 小时）高亮。
 */
export function LiveCalendar({ days, validDays }: { days: Map<string, LiveDayStat>; validDays: number }) {
  const anchor = useMemo(() => {
    const dates = [...days.keys()].sort();
    const target = dates.at(-1) ?? beijingToday();
    return { year: Number(target.slice(0, 4)), month: Number(target.slice(5, 7)) - 1 };
  }, [days]);

  const [cursor, setCursor] = useState(anchor);
  const today = beijingToday();

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const daysInPrev = new Date(cursor.year, cursor.month, 0).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1) {
        return { label: daysInPrev + dayNumber, key: "", inMonth: false };
      }
      if (dayNumber > daysInMonth) {
        return { label: dayNumber - daysInMonth, key: "", inMonth: false };
      }
      return { label: dayNumber, key: dateKey(cursor.year, cursor.month, dayNumber), inMonth: true };
    }).slice(0, Math.ceil((startOffset + daysInMonth) / 7) * 7);
  }, [cursor]);

  const shift = (step: number) =>
    setCursor(current => {
      const next = new Date(current.year, current.month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavButton label="上一月" onClick={() => shift(-1)}>‹</NavButton>
          <span className="min-w-24 text-center text-sm font-semibold text-ink">
            {cursor.year}年{cursor.month + 1}月
          </span>
          <NavButton label="下一月" onClick={() => shift(1)}>›</NavButton>
        </div>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
          有效直播 {validDays} 天
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
        {WEEK_LABELS.map(label => (
          <span key={label} className="py-1">{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((cell, index) => {
          const stat = cell.key ? days.get(cell.key) : undefined;
          const isToday = cell.key === today;
          return (
            <div
              key={`${cell.key}-${index}`}
              title={
                stat
                  ? `${cell.key}：${stat.sessions} 场 / ${formatHours(stat.seconds)} 小时${stat.valid ? "（有效）" : ""}`
                  : undefined
              }
              className={clsx(
                "flex aspect-square items-center justify-center rounded-md tabular-nums transition",
                !cell.inMonth && "text-ink-soft/35",
                cell.inMonth && !stat && "text-ink/70",
                stat && !stat.valid && "bg-brand-soft/25 font-medium text-brand",
                stat?.valid && "bg-brand font-semibold text-parchment shadow-sm",
                isToday && "ring-2 ring-brand-soft ring-offset-1 ring-offset-parchment",
              )}
            >
              {cell.label}
            </div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <Legend className="bg-brand">有效直播（单日 &gt; 1 小时）</Legend>
        <Legend className="bg-brand-soft/60">有直播</Legend>
        <Legend className="border-2 border-brand-soft bg-transparent">当日</Legend>
      </ul>
    </div>
  );
}

function NavButton({ children, label, onClick }: { children: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-brand/20 text-brand transition hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </button>
  );
}

function Legend({ children, className }: { children: string; className: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={clsx("h-2.5 w-2.5 rounded-full", className)} />
      {children}
    </li>
  );
}
