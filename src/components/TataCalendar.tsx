import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LiveCalendar } from "./LiveCalendar";
import type { LiveDayStat } from "../lib/metrics";

type Props = { days: Map<string, LiveDayStat>; validDays: number };

export function TataCalendar(props: Props) {
  const [open, setOpen] = useState(false);
  return <><button className="tata-calendar-trigger" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>查看直播日历 <span aria-hidden>↗</span></button>{open ? <CalendarDialog {...props} close={() => setOpen(false)} /> : null}</>;
}

function CalendarDialog({ days, validDays, close }: Props & { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="tata-calendar-dialog" aria-labelledby="tata-calendar-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  }}><header><h2 id="tata-calendar-title">直播日历</h2><button type="button" aria-label="关闭直播日历" onClick={close}>×</button></header><LiveCalendar days={days} validDays={validDays} compactLegend /></dialog>, document.body);
}
