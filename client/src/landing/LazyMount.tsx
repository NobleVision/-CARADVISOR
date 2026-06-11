import { useEffect, useRef, useState, type ReactNode } from "react";

type LazyMountProps = {
  children: ReactNode;
  /** How far outside the viewport mounting begins (IntersectionObserver rootMargin). */
  rootMargin?: string;
  className?: string;
};

/**
 * Defers mounting heavy children (e.g. the 35MB video rotation) until the
 * user scrolls near them. Falls back to mounting immediately when
 * IntersectionObserver is unavailable.
 */
export function LazyMount({ children, rootMargin = "400px", className }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {show ? children : null}
    </div>
  );
}
