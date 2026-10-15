import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

export function useTataMotion(root: RefObject<HTMLDivElement | null>, ready: boolean, revision: unknown) {
  useEffect(() => {
    if (!root.current || !ready) return;
    {
      const context = gsap.context(() => {}, root.current!);
      const played = new WeakSet<Element>();
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || played.has(entry.target)) continue;
          played.add(entry.target);
          context.add(() => {
            if (entry.target.classList.contains("tata-meter-fill")) {
              gsap.fromTo(entry.target, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.9, ease: "power3.out" });
              const star = entry.target.closest(".tata-drawn-meter")?.querySelector(".tata-meter-cap");
              if (star) gsap.fromTo(star, { rotation: -12, scale: 0.9 }, { rotation: -5, scale: 1, duration: 0.8, ease: "elastic.out(1,0.5)" });
            } else {
              gsap.fromTo(entry.target, { y: 8, rotation: -8, scale: 0.92 }, { y: 0, rotation: 0, scale: 1, duration: 0.8, ease: "back.out(1.8)" });
              gsap.fromTo(entry.target, { rotation: -4, y: 0 }, { rotation: 4, y: -5, duration: 1.8, repeat: -1, yoyo: true, delay: 0.8, ease: "sine.inOut" });
              const sparkle = entry.target.querySelector("path:last-child");
              if (sparkle) gsap.fromTo(sparkle, { scale: .65, opacity: .5, transformOrigin: "center", transformBox: "fill-box" }, { scale: 1.25, opacity: 1, duration: 1.1, repeat: -1, yoyo: true, ease: "sine.inOut" });
            }
          });
        }
      }, { threshold: 0.3 });
      root.current!.querySelectorAll(".tata-meter-fill, .tata-rank-medal").forEach(element => observer.observe(element));
      const visibility = () => context.getTweens().forEach((tween: gsap.core.Tween) => document.hidden ? tween.pause() : tween.resume());
      document.addEventListener("visibilitychange", visibility);
      return () => { document.removeEventListener("visibilitychange", visibility); observer.disconnect(); context.revert(); };
    }
  }, [root, ready, revision]);
}
