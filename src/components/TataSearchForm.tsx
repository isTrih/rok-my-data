import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { SearchForm } from "./SearchForm";

export function TataSearchForm({ value, savedCreators, periods, periodsLoading, activityPeriodId, loading, onValueChange, onPeriodChange, onSubmit }: ComponentProps<typeof SearchForm>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedLabel = periods.find(period => period.activity_period_id === activityPeriodId)?.period ?? "";
  useEffect(() => {
    if (open) { dialog.current?.showModal(); input.current?.focus(); }
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const close = () => { setOpen(false); opener.current?.focus(); };
  return <div className="tata-query-entry">
    <label className="tata-period-picker" data-long-label={selectedLabel.length > 10}>
      <span className="sr-only">选择期数</span>
      <select aria-label="选择期数" disabled={loading || periods.length === 0} value={activityPeriodId ?? ""} onChange={event => onPeriodChange(Number(event.target.value))}>
        {periods.length === 0 ? <option value="">{periodsLoading ? "期数加载中…" : "暂无可选期数"}</option> : null}
        {periods.map(period => <option key={period.activity_period_id} value={period.activity_period_id}>{period.period}</option>)}
      </select>
    </label>
    <button ref={opener} type="button" className="tata-query-trigger" disabled={loading || activityPeriodId === null} onClick={() => setOpen(true)} aria-haspopup="dialog"><span className="sr-only">{loading ? "查询中…" : "查询数据"}</span></button>
    <dialog ref={dialog} className="tata-id-dialog" aria-labelledby="tata-id-title" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <form onSubmit={event => { event.preventDefault(); if (!value.trim()) return; close(); onSubmit(); }}>
        <h2 id="tata-id-title" className="sr-only">输入创作者 ID</h2>
        <button type="button" className="tata-modal-close" aria-label="关闭" onClick={close}>×</button>
        <input ref={input} value={value} aria-label="创作者 ID" onChange={event => onValueChange(event.target.value)} placeholder="请输入创作者 ID" autoComplete="off" enterKeyHint="search" />
        <button className="tata-confirm" type="submit" disabled={!value.trim()}><span className="sr-only">立即查询</span></button>
      </form>
      {savedCreators.length > 0 ? <label className="tata-history"><span>历史查询</span><select aria-label="选择历史查询姓名" value={savedCreators.some(creator => creator.key === value) ? value : ""} onChange={event => { onValueChange(event.target.value); input.current?.focus(); }}><option value="">输入新的创作者 ID</option>{savedCreators.map(creator => <option key={creator.key} value={creator.key}>{creator.name} · {creator.key}</option>)}</select></label> : null}
    </dialog>
  </div>;
}
