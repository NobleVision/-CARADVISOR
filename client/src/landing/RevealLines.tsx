import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "./gsap";

type RevealLinesProps = {
  /** One ReactNode per visual line. */
  lines: ReactNode[];
  className?: string;
  /** Seconds before the first line starts. */
  delay?: number;
  as?: "h1" | "h2" | "p" | "div";
};

/**
 * Staggered line reveal (the classic masked rise) without any paid plugin:
 * each line sits in an overflow-hidden wrapper and slides up into view.
 * Content is authored visible; the hide+animate only happens when motion is
 * allowed, so reduced-motion users simply see the finished headline.
 */
export function RevealLines({ lines, className = "", delay = 0, as: Tag = "div" }: RevealLinesProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".reveal-line-inner", {
          yPercent: 112,
          duration: 1.05,
          ease: "power4.out",
          stagger: 0.12,
          delay,
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref}>
      <Tag className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden py-[0.08em]">
            <span className="reveal-line-inner block will-change-transform">{line}</span>
          </span>
        ))}
      </Tag>
    </div>
  );
}
