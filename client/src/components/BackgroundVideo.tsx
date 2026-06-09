import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BackgroundVideoProps = {
  /** Public URLs of the clips to rotate through (e.g. "/videos/bg-01.mp4"). */
  videos: string[];
  /** Shown before the first frame loads, on reduced-motion, or if all clips fail. */
  poster?: string;
  className?: string;
  /** Overlay tint for foreground legibility. */
  overlayClassName?: string;
  /** Crossfade duration between clips, in ms. */
  fadeMs?: number;
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

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Full-bleed background that crossfades through a shuffled set of muted video
 * clips. Two stacked <video> layers alternate: one plays while the other holds
 * the preloaded next clip, then they crossfade via opacity. The playlist is
 * reshuffled when exhausted (never repeating a clip back-to-back). Falls back to
 * the poster image on reduced-motion or if the clips fail to load/play.
 */
export function BackgroundVideo({
  videos,
  poster,
  className,
  overlayClassName,
  fadeMs = 1200,
}: BackgroundVideoProps) {
  const reduceMotion = usePrefersReducedMotion();
  const enabled = !reduceMotion && videos.length > 0;

  // Playlist queue (indices into a reshuffled order) + the last clip played, so
  // a reshuffle never repeats the previous clip first.
  const queueRef = useRef<string[]>([]);
  const lastRef = useRef<string | null>(null);
  const errorsRef = useRef(0);

  const nextSrc = useCallback((): string => {
    if (videos.length <= 1) return videos[0] ?? "";
    if (queueRef.current.length === 0) {
      const s = shuffle(videos);
      if (s[0] === lastRef.current) [s[0], s[1]] = [s[1], s[0]];
      queueRef.current = s;
    }
    const src = queueRef.current.shift()!;
    lastRef.current = src;
    return src;
  }, [videos]);

  // Two layers; `front` (-1 until initialised) is the visible/playing one.
  const [layers, setLayers] = useState<[string, string]>(["", ""]);
  const [front, setFront] = useState(-1);
  const [failed, setFailed] = useState(false);
  const ref0 = useRef<HTMLVideoElement>(null);
  const ref1 = useRef<HTMLVideoElement>(null);
  const refs = [ref0, ref1] as const;

  // Initialise the two layers once enabled.
  useEffect(() => {
    if (!enabled) return;
    queueRef.current = [];
    lastRef.current = null;
    errorsRef.current = 0;
    setLayers([nextSrc(), nextSrc()]);
    setFailed(false);
    setFront(0);
  }, [enabled, nextSrc]);

  // Play the front layer from the start whenever `front` flips; pause the other.
  useEffect(() => {
    if (!enabled || front < 0) return;
    const cur = refs[front].current;
    const other = refs[1 - front].current;
    if (other) {
      try {
        other.pause();
      } catch {
        /* ignore */
      }
    }
    if (cur) {
      try {
        cur.currentTime = 0;
      } catch {
        /* ignore */
      }
      const p = cur.play();
      if (p && typeof p.catch === "function") p.catch(() => advance());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, enabled]);

  // Crossfade to the other layer, then queue the next clip into the one we left.
  const advance = useCallback(() => {
    const leaving = front;
    if (leaving < 0) return;
    setFront(1 - leaving);
    window.setTimeout(() => {
      setLayers((prev) => {
        const copy: [string, string] = [prev[0], prev[1]];
        copy[leaving] = nextSrc();
        return copy;
      });
    }, fadeMs);
  }, [front, fadeMs, nextSrc]);

  const handleError = useCallback(
    (i: number) => {
      errorsRef.current += 1;
      if (errorsRef.current > videos.length + 2) {
        setFailed(true);
        return;
      }
      if (i === front) {
        advance();
      } else {
        // Replace a broken preloaded clip so the next crossfade is clean.
        setLayers((prev) => {
          const copy: [string, string] = [prev[0], prev[1]];
          copy[i] = nextSrc();
          return copy;
        });
      }
    },
    [advance, front, nextSrc, videos.length],
  );

  const showVideos = enabled && !failed;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background",
        className,
      )}
    >
      {poster && (
        <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {showVideos &&
        ([0, 1] as const).map((i) => (
          <video
            key={i}
            ref={refs[i]}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{
              opacity: front === i ? 1 : 0,
              transitionDuration: `${fadeMs}ms`,
            }}
            muted
            playsInline
            preload="auto"
            poster={poster}
            aria-hidden="true"
            src={layers[i] || undefined}
            onEnded={() => {
              if (i === front) advance();
            }}
            onError={() => handleError(i)}
            onPlaying={() => {
              if (i === front) errorsRef.current = 0;
            }}
          />
        ))}

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
