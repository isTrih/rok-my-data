import clsx from "clsx";
import type { ProjectPeriod } from "../lib/types";

/** 查询表单：创作营密钥 + 期数。 */
export function SearchForm({
  value,
  periods,
  activityPeriodId,
  loading,
  onValueChange,
  onPeriodChange,
  onSubmit,
}: {
  value: string;
  periods: ProjectPeriod[];
  activityPeriodId: number | null;
  loading: boolean;
  onValueChange: (next: string) => void;
  onPeriodChange: (next: number) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-2.5"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">创作营密钥</span>
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
            🔑
          </span>
          <input
            value={value}
            onChange={event => onValueChange(event.target.value)}
            placeholder="请输入创作营密钥"
            autoComplete="on"
            enterKeyHint="search"
            className="w-full rounded-lg border border-brand/25 bg-white/80 py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </label>

        <label className="sm:w-52">
          <span className="sr-only">选择期数</span>
          <select
            value={activityPeriodId ?? ""}
            onChange={event => onPeriodChange(Number(event.target.value))}
            disabled={periods.length === 0}
            className="w-full rounded-lg border border-brand/25 bg-white/80 px-3 py-2.5 text-sm text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {periods.length === 0 ? <option value="">期数加载中…</option> : null}
            {periods.map(period => (
              <option key={period.activity_period_id} value={period.activity_period_id}>
                {period.period}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || value.trim().length === 0 || activityPeriodId === null}
          className={clsx(
            "rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-parchment transition",
            "enabled:hover:bg-brand/90 enabled:active:scale-[0.98] disabled:opacity-45",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {loading ? "查询中…" : "立即查询"}
        </button>
      </div>
    </form>
  );
}
