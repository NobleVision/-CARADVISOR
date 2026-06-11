import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

type StatCounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/**
 * Counts up to `value` when scrolled into view (once). Authored with the
 * final value so reduced-motion users and non-JS render paths see the truth.
 */
export function StatCounter({ value, prefix = "", suffix = "", className = "" }: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (v: number) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current;
        if (!el) return;
        const proxy = { v: 0 };
        el.textContent = format(0);
        gsap.to(proxy, {
          v: value,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = format(proxy.v);
          },
        });
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
