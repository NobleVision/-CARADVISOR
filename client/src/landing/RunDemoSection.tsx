import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { AdvisoryCallout } from "@/components/AdvisoryCallout";
import type { TrustSignal, VehicleAdvisory } from "@/lib/inventory";
import { Camera, Fuel, Gauge, MapPin } from "lucide-react";
import { gsap, useGSAP } from "./gsap";

// Self-contained demo data (no tRPC) — the exact trap from the golden rules.
const DEMO_ADVISORIES: VehicleAdvisory[] = [
  {
    id: "demo-cvt-trap",
    severity: "avoid",
    title: "Jatco CVT transmission failure (automatic)",
    detail:
      "This era's CVT automatics are notorious for overheating, whining, slipping, and sudden death — frequently before 120,000 miles. Replacement costs upwards of $4,000, often more than the car is worth.",
    watchFor: [],
    transmissionNote:
      "If it's the automatic — avoid; the manual is actually reliable. Verify the transmission before you go.",
    appliedDelta: -45,
    source: "GOGETTER Reliability Index v1",
  },
];
const DEMO_TRUST: TrustSignal = {
  level: "flagged",
  reasons: [],
  suspiciousDeal: true,
};

/**
 * The differentiator, staged: a tempting trap listing slides in, then the
 * real product RUN banner stamps over it. Dealer-funded sites can't show you
 * this — that's the whole point.
 */
export function RunDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".run-card", { y: 70, opacity: 0, rotate: 0 });
        gsap.set(".run-stamp", { scale: 1.6, opacity: 0, rotate: -9 });
        gsap.set(".run-flash", { opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: sectionRef.current, start: "top 62%", once: true },
        });
        tl.to(".run-card", { y: 0, opacity: 1, rotate: -1.2, duration: 0.8, ease: "power3.out" })
          .to(".run-flash", { opacity: 0.5, duration: 0.08 }, "+=0.35")
          .to(".run-flash", { opacity: 0, duration: 0.3 })
          .to(
            ".run-stamp",
            { scale: 1, opacity: 1, rotate: -2, duration: 0.55, ease: "back.out(1.8)" },
            "-=0.32",
          );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">
            Buyer-first means saying it
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            And when the data says
            <br />
            walk away… <span className="text-gold-gradient">we say RUN.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Listing sites earn their money from dealers, so the cons stay quiet. GOGETTER indexes the
            documented traps — the transmissions that die at 90k, the engines that seize, the model
            years thieves love — and stamps them in red before you waste a Saturday.
          </p>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            That suspiciously cheap, low-mileage one? It's cheap because the seller can see what's
            coming. Now you can too.
          </p>
        </div>

        {/* The staged trap listing */}
        <div className="relative">
          <div className="run-flash pointer-events-none absolute inset-0 z-10 rounded-2xl bg-rose-400" aria-hidden="true" />
          <div className="run-card rounded-2xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/15 text-[10px] text-sky-300">
                    Independent Dealer
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Camera className="size-3" /> Stock image
                  </span>
                </div>
                <h3 className="font-serif text-xl font-semibold leading-tight">2015 Compact Sedan SV</h3>
                <p className="text-sm text-muted-foreground">"Newest car on the lot at this price!"</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$5,500</div>
                <div className="text-[11px] text-emerald-400">$2,100 under market</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Gauge className="size-3.5" /> 88,000 mi
              </span>
              <span className="inline-flex items-center gap-1">
                <Fuel className="size-3.5" /> Gas · 33 mpg
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> 5 mi away
              </span>
            </div>

            <div className="run-stamp mt-4 origin-center">
              <AdvisoryCallout advisories={DEMO_ADVISORIES} riskLevel="high" trust={DEMO_TRUST} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
