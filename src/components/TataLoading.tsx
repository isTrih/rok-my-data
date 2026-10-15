import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

export function TataLoading({ stage }: { stage: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const context = gsap.context(() => {
      gsap.fromTo(element, { scale: .88, y: 16, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: .4, ease: "back.out(1.5)" });
      gsap.fromTo(".tata-loading-stars img", { y: 5, rotation: -12, scale: .9 }, { y: -12, rotation: 12, scale: 1.12, duration: .65, stagger: .16, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.fromTo(".tata-loading-track span", { xPercent: -100 }, { xPercent: 260, duration: 1.5, repeat: -1, ease: "sine.inOut" });
    }, element!);
    return () => { context.revert(); element?.close(); document.body.style.overflow = overflow; };
  }, []);
  return createPortal(<dialog ref={dialog} className="tata-loading" aria-label="正在加载" onCancel={event => event.preventDefault()}>
    <div role="status" aria-live="polite">
      <div className="tata-loading-stars" aria-hidden>{[0, 1, 2].map(index => <img key={index} src="/tata/star.png" alt="" style={{ animationDelay: `${index * 140}ms` }} />)}</div>
      <p>{stage}</p>
      <div className="tata-loading-track" aria-hidden><span /></div>
    </div>
  </dialog>, document.body);
}
