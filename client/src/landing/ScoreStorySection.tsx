import { useRef } from "react";
import { BadgeCheck } from "lucide-react";
import { gsap, useGSAP } from "./gsap";

const INPUTS = [
  { label: "Reliability", value: 91, note: "Make heuristics + the curated Reliability Index" },
  { label: "Safety", value: 84, note: "Decoded driver-assist and airbag equipment" },
  { label: "Age & Mileage", value: 78, note: "Odometer judged against expected wear" },
  { label: "Efficiency", value: 88, note: "Drivetrain and real running costs" },
];

/**
 * Pinned scroll story: the score counts 38 → 92 while the five inputs fill in
 * sequence. Reduced-motion users see the finished state (92, full bars).
 */
export function ScoreStorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const proxy = { v: 38 };
        if (scoreRef.current) scoreRef.current.textContent = "38";
        gsap.set(".score-bar-fill", { scaleX: 0, transformOrigin: "left center" });
        gsap.set(".score-note", { opacity: 0, x: 8 });
        gsap.set(".score-clear-chip", { opacity: 0, y: 10 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=220%",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        });

        tl.to(proxy, {
          v: 92,
          ease: "none",
          duration: 4,
          onUpdate: () => {
            if (scoreRef.current) scoreRef.current.textContent = String(Math.round(proxy.v));
          },
        });

        INPUTS.forEach((_, i) => {
          const at = 0.4 + i * 0.85;
          tl.to(`.score-bar-fill-${i}`, { scaleX: 1, duration: 0.7, ease: "power2.out" }, at);
          tl.to(`.score-note-${i}`, { opacity: 1, x: 0, duration: 0.4 }, at + 0.15);
        });
        tl.to(".score-clear-chip", { opacity: 1, y: 0, duration: 0.5 }, 3.6);
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative bg-background">
      <div className="flex min-h-svh items-center pt-16">
        <div className="container grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              The GOGETTER Score
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
              One honest number.
              <br />
              Five real inputs.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              No black box. Every score decomposes into the things that actually decide whether a used
              car treats you well — and every point is explained in plain English.
            </p>
            <div className="mt-8 flex items-end gap-3">
              <span
                ref={scoreRef}
                className="text-gold-gradient font-serif text-[7rem] font-semibold leading-none tabular-nums sm:text-[9rem]"
              >
                92
              </span>
              <div className="mb-4">
                <div className="text-2xl font-semibold text-foreground">/100</div>
                <div className="text-sm text-muted-foreground">Grade A · transparent</div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {INPUTS.map((input, i) => (
              <div key={input.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium">{input.label}</span>
                  <span className={`score-note score-note-${i} text-xs text-muted-foreground`}>
                    {input.note}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`score-bar-fill score-bar-fill-${i} h-full rounded-full bg-gradient-to-r from-[#C9A24A] to-[#F6D488]`}
                    style={{ width: `${input.value}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="score-clear-chip flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <BadgeCheck className="size-4 shrink-0 text-emerald-400" />
              <span className="text-sm text-emerald-200">
                Known-issue scan: <span className="font-semibold">clear</span> — no documented defects
                for this model year
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
