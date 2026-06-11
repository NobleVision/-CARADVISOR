import { Suspense, lazy, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { RevealLines } from "./RevealLines";
import { HeroStaticFallback } from "./HeroStaticFallback";
// Type-only import — must not pull the three.js chunk into the landing chunk.
import type { ParticleCarSceneHandle } from "./ParticleCarScene";

// The Three.js scene lives in its own chunk; the static fallback paints first.
const ParticleCarScene = lazy(() => import("./ParticleCarScene"));

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParticleCarSceneHandle>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Feed hero scroll progress to the particle scene (dispersal) and
        // gently lift + fade the copy as the story begins.
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => sceneRef.current?.setScroll(self.progress),
        });
        gsap.to(contentRef.current, {
          yPercent: -14,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "72% top",
            scrub: true,
          },
        });
        gsap.from(".hero-after", {
          opacity: 0,
          y: 12,
          duration: 0.9,
          ease: "power3.out",
          delay: 1.15,
          stagger: 0.12,
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative flex min-h-svh items-center overflow-hidden">
      {/* Particle layer — never intercepts clicks. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Suspense fallback={<HeroStaticFallback />}>
          <ParticleCarScene ref={sceneRef} onReady={() => ScrollTrigger.refresh()} />
        </Suspense>
        {/* Bottom fade into the page background so the next section seats cleanly. */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div ref={contentRef} className="container relative pb-24 pt-28">
        <div className="max-w-3xl">
          <span className="hero-after inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="size-3.5" /> The buyer-first AI car advisor
          </span>

          <RevealLines
            as="h1"
            className="mt-6 font-serif text-[clamp(2.6rem,7vw,4.9rem)] font-semibold leading-[1.02] tracking-tight"
            delay={0.25}
            lines={[
              <>Don't buy on hope.</>,
              <>
                Buy on <span className="text-gold-gradient">evidence.</span>
              </>,
            ]}
          />

          <p className="hero-after mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Decode any VIN into a transparent 0–100 score, get warned about known-defect model years
            before you drive out, and let the AI advisor walk you to the lot with a checklist — not luck.
          </p>

          <div className="hero-after mt-8 flex flex-wrap items-center gap-3">
            <Link href="/lookup">
              <Button size="lg" className="gap-2 px-7">
                <Search className="size-4" /> Score a VIN
              </Button>
            </Link>
            <Link href="/find">
              <Button size="lg" variant="outline" className="gap-2 bg-transparent px-7">
                Find my car
              </Button>
            </Link>
          </div>

          <p className="hero-after mt-5 text-xs text-muted-foreground">
            Free VIN decoding via the public NHTSA database · No sign-up needed to look
          </p>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="hero-after pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground">
        <ChevronDown className="size-5 motion-safe:animate-bounce" />
      </div>
    </section>
  );
}
