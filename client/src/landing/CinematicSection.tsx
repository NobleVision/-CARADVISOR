import { useRef } from "react";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { LANDING_VIDEOS, LANDING_POSTER } from "@/lib/landingVideos";
import { gsap, useGSAP } from "./gsap";
import { LazyMount } from "./LazyMount";

/**
 * Full-bleed cinematic interlude: the existing b-roll rotation (lazy-mounted
 * so the clips never download until the user scrolls near) under a parallax
 * pull-quote.
 */
export function CinematicSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".cinematic-quote",
          { yPercent: 18 },
          {
            yPercent: -18,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative h-[72svh] overflow-hidden">
      <LazyMount className="absolute inset-0" rootMargin="600px">
        <div className="relative h-full w-full">
          <BackgroundVideo
            videos={LANDING_VIDEOS}
            poster={LANDING_POSTER}
            overlayClassName="bg-gradient-to-b from-background via-background/35 to-background"
          />
        </div>
      </LazyMount>
      <div className="container relative flex h-full items-center justify-center">
        <blockquote className="cinematic-quote max-w-3xl text-center">
          <p className="font-serif text-2xl font-medium leading-snug text-foreground sm:text-4xl">
            "Walk the lot like you've{" "}
            <span className="text-gold-gradient">already read the history.</span>"
          </p>
          <footer className="mt-4 text-sm uppercase tracking-[0.25em] text-muted-foreground">
            The GOGETTER promise
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
