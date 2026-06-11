import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroSection } from "@/landing/HeroSection";
import { MarqueeStrip } from "@/landing/MarqueeStrip";
import { ScoreStorySection } from "@/landing/ScoreStorySection";
import { RunDemoSection } from "@/landing/RunDemoSection";
import { CinematicSection } from "@/landing/CinematicSection";
import { FeatureGridSection } from "@/landing/FeatureGridSection";
import { HowItWorksSection } from "@/landing/HowItWorksSection";
import { StorySection } from "@/landing/StorySection";
import { CtaBandSection } from "@/landing/CtaBandSection";
import { TourPrompt } from "@/tour/TourPrompt";

/**
 * The public brand home: a scroll story from "evidence, not hope" through the
 * score anatomy, the RUN moment, and the product tour. GSAP + the Three.js
 * particle hero stay inside this lazy-loaded chunk; every animation degrades
 * to a fully static page under prefers-reduced-motion.
 */
export default function Landing() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main>
        <HeroSection />
        <MarqueeStrip />
        <ScoreStorySection />
        <RunDemoSection />
        <CinematicSection />
        <FeatureGridSection />
        <HowItWorksSection />
        <StorySection />
        <CtaBandSection />
      </main>
      <SiteFooter />
      {/* First-visit tour offer — overlay sibling, never touches the GSAP scroll story */}
      <TourPrompt />
    </div>
  );
}
