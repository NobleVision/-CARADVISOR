import { useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Bell,
  Car,
  GitCompareArrows,
  MessageSquare,
  Search,
  ShieldCheck,
} from "lucide-react";
import { gsap, useGSAP } from "./gsap";

const FEATURES = [
  {
    icon: Search,
    title: "Decode any VIN",
    desc: "Full factory spec from the free NHTSA database — engine, drivetrain, safety equipment, plant.",
    href: "/lookup",
  },
  {
    icon: ShieldCheck,
    title: "Dual-layer score",
    desc: "Model-level intelligence live today, with known-defect warnings; per-VIN history coming to Premium.",
    href: "/lookup",
  },
  {
    icon: MessageSquare,
    title: "AI advisor chat",
    desc: "Ask anything about the exact car — it answers from the decoded specs and the Reliability Index.",
    href: "/lookup",
  },
  {
    icon: Car,
    title: "Find My Car",
    desc: "Describe what you need in plain English; get a ranked shortlist with honest trade-offs.",
    href: "/find",
  },
  {
    icon: GitCompareArrows,
    title: "Compare side by side",
    desc: "Up to three VINs in one view — specs, scores, and the truth between them.",
    href: "/compare",
  },
  {
    icon: Bell,
    title: "Garage & price drops",
    desc: "Save cars and searches; get alerted when prices fall or new matches appear.",
    href: "/saved",
  },
];

export function FeatureGridSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".feature-card", {
          y: 34,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: sectionRef.current, start: "top 72%", once: true },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="container py-24 sm:py-32">
      <div className="max-w-2xl">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Everything between "hmm" and handshake
        </span>
        <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
          The whole hunt, one garage.
        </h2>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="feature-card card-lift group rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/25">
              <f.icon className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:opacity-100">
              Open <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
