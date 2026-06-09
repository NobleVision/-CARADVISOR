import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type VideoSource = { src: string; type: string };

type BackgroundVideoProps = {
  /** Ordered <source> list, e.g. webm then mp4. Falls back to the poster if none load. */
  sources?: VideoSource[];
  poster?: string;
  className?: string;
  /** Overlay tint for text legibility. */
  overlayClassName?: string;
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const handler = () => setReduce(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduce;
}

/**
 * Full-bleed looping background video with a graceful poster fallback. If the
 * user prefers reduced motion (or the video files aren't present yet), the
 * poster image is shown instead. A dark overlay keeps foreground text readable.
 */
export function BackgroundVideo({
  sources = [],
  poster,
  className,
  overlayClassName,
}: BackgroundVideoProps) {
  const reduceMotion = usePrefersReducedMotion();
  const showVideo = !reduceMotion && sources.length > 0;

  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background", className)}>
      {showVideo ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          aria-hidden="true"
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : (
        poster && (
          <img src={poster} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        )
      )}
      <div
        className={cn(
          "absolute inset-0",
          overlayClassName ??
            "bg-gradient-to-b from-background/80 via-background/55 to-background",
        )}
      />
    </div>
  );
}
