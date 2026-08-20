import { useEffect, useState } from "react";

/**
 * 占比环形图。出于保密要求只呈现大致比例，不展示具体百分比数字。
 */
export function ShareDonut({
  ratio,
  caption,
  mine,
  poolLabel,
}: {
  ratio: number;
  caption: string;
  mine: string;
  poolLabel: string;
}) {
  const safeRatio = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(safeRatio));
    return () => cancelAnimationFrame(frame);
  }, [safeRatio]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const level = safeRatio >= 0.2 ? "领先梯队" : safeRatio >= 0.08 ? "中上水平" : safeRatio >= 0.02 ? "稳步积累" : "起步阶段";

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={`${caption}：${level}`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(138,75,34,0.14)" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#donut-gradient)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <defs>
          <linearGradient id="donut-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c98a4b" />
            <stop offset="100%" stopColor="#8a4b22" />
          </linearGradient>
        </defs>
      </svg>
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-medium text-brand">{caption}</p>
        <p className="text-ink-soft">
          我的数据 <span className="font-semibold tabular-nums text-ink">{mine}</span>
        </p>
        <p className="text-xs font-medium text-brand-soft">当前占比水平：{level}</p>
      </div>
    </div>
  );
}
