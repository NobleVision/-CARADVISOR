import { createElement, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "./gsap";
import { useTour } from "@/tour/TourProvider";

const HERO_SCRIPT_ID = "car-advisor-hero-particles-script";
const HERO_SCRIPT_SRC = "/hero/hero-particles.js";

function useHeroParticlesScript() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (customElements.get("hero-particles")) return;
    if (document.getElementById(HERO_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = HERO_SCRIPT_ID;
    script.src = HERO_SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

/**
 * Reference-package hero implementation. The copy layer is real DOM (selectable,
 * clickable, z-indexed above the canvas) while the vanilla <hero-particles>
 * engine owns the right-side five-car morph loop from /public/hero/.
 */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const { startTour } = useTour();
  useHeroParticlesScript();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".ca-hero-reveal", {
          opacity: 0,
          y: 18,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          delay: 0.18,
        });

        gsap.to(copyRef.current, {
          yPercent: -8,
          autoAlpha: 0.62,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen w-full items-center overflow-hidden bg-[#0b0b0d] text-[#f2ede3]"
      style={{ fontFamily: '"Instrument Sans", Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Atmosphere layers behind the canvas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 90% at 68% 62%, rgba(212,175,106,0.06) 0%, rgba(212,175,106,0.02) 34%, rgba(0,0,0,0) 62%), radial-gradient(140% 110% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[13.5%] left-[30%] right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(212,175,106,0) 0%, rgba(212,175,106,0.16) 45%, rgba(212,175,106,0) 100%)",
        }}
      />

      {/* Particle car loop — pointer-events disabled so links/buttons remain usable. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {createElement("hero-particles", {
          "data-assets-base": "/hero/",
          className: "h-full w-full",
          style: { position: "absolute", inset: 0, width: "100%", height: "100%" },
        })}
      </div>

      <div
        ref={copyRef}
        className="relative z-[2] flex max-w-[560px] flex-col gap-7 px-6 py-24 pl-[clamp(28px,6vw,88px)] max-[900px]:max-w-[min(560px,92vw)] max-[900px]:pb-[52vh] max-[900px]:pt-28"
      >
        <div className="ca-hero-reveal flex items-center gap-3">
          <span className="h-px w-[26px] bg-[rgba(212,175,106,0.7)]" />
          <span className="text-xs font-medium uppercase tracking-[0.32em] text-[rgba(212,175,106,0.9)]">
            Car Advisor
          </span>
        </div>

        <h1
          className="ca-hero-reveal text-[clamp(42px,5.2vw,84px)] font-normal leading-[1.04] tracking-[-0.01em] [text-wrap:balance]"
          style={{ fontFamily: '"Instrument Serif", Fraunces, ui-serif, Georgia, serif' }}
        >
          Don&apos;t buy on hope.
          <br />
          <em className="font-normal italic text-[#d4af6a]">Buy on evidence.</em>
        </h1>

        <p className="ca-hero-reveal max-w-[430px] text-[17px] leading-[1.65] text-[rgba(242,237,227,0.62)] [text-wrap:pretty]">
          Get an instant 0–100 score, get warned about issues before you drive out, and let
          the AI build your inspection checklist — not luck.
        </p>

        <div className="ca-hero-reveal mt-1 flex flex-wrap items-center gap-3.5">
          <Link
            href="/lookup"
            className="group inline-flex items-center gap-2.5 rounded-full bg-[linear-gradient(180deg,#e0bd7c_0%,#c9a35c_100%)] px-7 py-[15px] text-[15px] font-semibold text-[#161208] shadow-[0_8px_28px_rgba(212,175,106,0.22)] transition hover:bg-[linear-gradient(180deg,#ecc98a_0%,#d4af6a_100%)] hover:shadow-[0_10px_34px_rgba(212,175,106,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6a]/70"
          >
            Check a car now
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => startTour("quick")}
            className="rounded-full border border-[rgba(242,237,227,0.18)] bg-transparent px-6 py-3.5 text-[15px] font-medium text-[rgba(242,237,227,0.85)] transition hover:border-[rgba(212,175,106,0.55)] hover:text-[#e9d9b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6a]/60"
          >
            Take the quick tour
          </button>
        </div>

        <p className="ca-hero-reveal text-[13px] tracking-[0.02em] text-[rgba(242,237,227,0.38)]">
          Free first report · No sign-up needed to look
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
