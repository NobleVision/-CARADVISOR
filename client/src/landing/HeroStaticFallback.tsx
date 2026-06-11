/**
 * Static hero backdrop shared by every degraded path: WebGL unavailable,
 * context lost, reduced motion, or while the Three.js chunk loads. Lives in
 * its own file so importing it never drags three.js into the landing chunk.
 */
export function HeroStaticFallback() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 42%, oklch(0.82 0.09 85 / 0.14), transparent 70%)",
        }}
      />
      <img
        src="/img/hero-car.svg"
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 w-[min(82vw,880px)] -translate-x-1/2 -translate-y-1/2 opacity-70"
      />
    </div>
  );
}
