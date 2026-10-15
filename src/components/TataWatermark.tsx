import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function TataWatermark({ name }: { name: string | null | undefined }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!name || !root.current) return;
    {
      const context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(root.current!.querySelectorAll(".tata-watermark-track")).forEach((row, index) => {
          gsap.fromTo(row, { xPercent: index % 2 ? -50 : 0 }, { xPercent: index % 2 ? 0 : -50, duration: 32, repeat: -1, ease: "none" });
        });
      }, root.current!);
      const visibility = () => context.getTweens().forEach((tween: gsap.core.Tween) => document.hidden ? tween.pause() : tween.resume());
      const safeArea = () => {
        const panel = document.querySelector(".tata-search-panel");
        const bottom = Math.max(0, (panel?.getBoundingClientRect().bottom ?? 0) + 12);
        root.current?.style.setProperty("clip-path", `inset(${bottom}px 0 0)`);
      };
      safeArea();
      window.addEventListener("scroll", safeArea, { passive: true });
      window.addEventListener("resize", safeArea);
      document.addEventListener("visibilitychange", visibility);
      return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("scroll", safeArea); window.removeEventListener("resize", safeArea); context.revert(); };
    }
  }, [name]);
  if (!name) return null;
  return createPortal(<div ref={root} className="tata-watermark" aria-hidden="true"><div className="tata-watermark-pattern">{Array.from({ length: 16 }, (_, row) => <div className="tata-watermark-row" key={row}><div className="tata-watermark-track">{[0, 1].map(copy => <div className="tata-watermark-group" key={copy}>{Array.from({ length: 7 }, (_, column) => <span className={(row + column) % 2 ? "is-outline" : "is-solid"} key={column}>{name}</span>)}</div>)}</div></div>)}</div></div>, document.body);
}
