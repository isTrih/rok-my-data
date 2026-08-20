import type { ReactNode } from "react";
import clsx from "clsx";

/** 国风面板容器。 */
export function Panel({
  children,
  className,
  title,
  extra,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <section className={clsx("panel relative p-4 sm:p-5", className)}>
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-brand">
            <span aria-hidden className="h-3.5 w-1 rounded-full bg-brand-soft" />
            {title}
          </h2>
          {extra}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** 活动头图：完整展示，按需缩放。 */
export function HeroBanner() {
  return (
    <div className="overflow-hidden rounded-xl border border-brand/20 bg-parchment-deep/40">
      <img
        src="/banner.jpg"
        alt="万国觉醒创作营活动头图"
        className="block h-auto w-full object-contain"
        style={{ maxHeight: "280px" }}
      />
    </div>
  );
}

/** 联系洛洛按钮。 */
export function ContactButton({ className }: { className?: string }) {
  return (
    <a
      href="https://aa929ud4lrb.feishu.cn/wiki/VxlZwUZ0XiFZK8kpGCfcrAZqnd3"
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-white/80 px-4 py-2 text-sm font-medium text-brand transition",
        "hover:border-brand hover:bg-brand/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <span aria-hidden>💬</span>
      联系洛洛
    </a>
  );
}
