import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

export function TataSupport() {
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem("tata/support-closed") === "1"; } catch { return false; } });
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (closed || !card.current) return;
    const element = card.current;
    {
      const drift = gsap.timeline({ repeat: -1, defaults: { duration: 4, ease: "sine.inOut" } });
      drift.to(element, { x: -12, y: -20, rotation: -3 }).to(element, { x: -30, y: -6, rotation: 2 }).to(element, { x: 0, y: 0, rotation: 0 });
      const pause = () => drift.pause();
      const resume = () => { if (!document.hidden && !element.matches(":hover, :focus-within")) drift.resume(); };
      const visibility = () => document.hidden ? pause() : resume();
      element.addEventListener("pointerenter", pause); element.addEventListener("pointerleave", resume);
      element.addEventListener("focusin", pause); element.addEventListener("focusout", resume);
      document.addEventListener("visibilitychange", visibility);
      return () => {
        element.removeEventListener("pointerenter", pause); element.removeEventListener("pointerleave", resume);
        element.removeEventListener("focusin", pause); element.removeEventListener("focusout", resume);
        document.removeEventListener("visibilitychange", visibility); drift.kill(); gsap.set(element, { clearProps: "transform" });
      };
    }
  }, [closed]);
  if (closed) return null;
  return createPortal(<aside ref={card} className="tata-floating-support" aria-label="咨询提示"><img src="/tata/star.png" alt="" /><div><span>有疑问？</span><strong>私聊花火/HaHa</strong></div><button type="button" aria-label="关闭私聊提示" onClick={() => { setClosed(true); try { sessionStorage.setItem("tata/support-closed", "1"); } catch { /* optional persistence */ } }}>×</button></aside>, document.body);
}
