import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * 指标卡：数值相比上次缓存增长时播放高亮与跳动动画。
 */
export function MetricCard({
  label,
  value,
  display,
  previous,
  hint,
  delay = 0,
}: {
  label: string;
  value: number;
  display: string;
  previous: number | null;
  hint?: string;
  delay?: number;
}) {
  const grew = previous !== null && value > previous;
  const delta = grew ? value - previous : 0;
  const [animating, setAnimating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!grew) return;
    const start = setTimeout(() => setAnimating(true), delay);
    timer.current = setTimeout(() => setAnimating(false), delay + 1500);
    return () => {
      clearTimeout(start);
      clearTimeout(timer.current);
    };
  }, [grew, delay, value]);

  return (
    <div
      className={clsx(
        "panel rise-fade flex flex-col items-center gap-1 px-2 py-3 text-center",
        animating && "card-glow",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-xs text-ink-soft">{label}</span>
      <span
        className={clsx(
          "text-lg font-semibold tabular-nums text-ink sm:text-xl",
          animating && "value-pop",
        )}
      >
        {display}
      </span>
      {grew ? (
        <span className="text-[11px] font-medium text-emerald-700">
          ↑ {delta.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-ink-soft/80">{hint}</span>
      ) : null}
    </div>
  );
}
