import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

const STEPS = [
  {
    title: "Paste a VIN",
    desc: "From a listing, a windshield, or a text from your kid. Decoding is free and takes seconds.",
  },
  {
    title: "Read the score",
    desc: "0–100 with every input explained — reliability, safety, age & mileage, efficiency, known issues.",
  },
  {
    title: "Ask the advisor",
    desc: "What to inspect, what it should cost to own, what to say on the phone. Grounded in this exact car.",
  },
  {
    title: "Buy with proof — or RUN",
    desc: "Walk in with the pre-purchase checklist and the three dealer questions. Or dodge the trap entirely.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".hiw-rail",
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".hiw-list",
              start: "top 70%",
              end: "bottom 55%",
              scrub: true,
            },
          },
        );
        gsap.from(".hiw-step", {
          x: -22,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: ".hiw-list", start: "top 72%", once: true },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="border-y border-border/60 bg-card/20 py-24 sm:py-32">
      <div className="container grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            Ten seconds to a verdict.
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            The same diligence a seasoned buyer spends a weekend on — compressed into one honest pass,
            for every car you're considering.
          </p>
        </div>

        <div className="hiw-list relative pl-10">
          {/* Progress rail */}
          <div className="absolute bottom-3 left-[15px] top-3 w-px bg-border" aria-hidden="true" />
          <div
            className="hiw-rail absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-[#F6D488] to-[#C9A24A]"
            aria-hidden="true"
          />
          <ol className="space-y-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="hiw-step relative">
                <span className="absolute -left-10 top-0 flex size-8 items-center justify-center rounded-full border border-primary/40 bg-background font-serif text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
