import { Button } from "@/components/ui/button";
import { Compass, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTour } from "./TourProvider";

/**
 * Non-blocking tour offer: a corner slide-in card that appears ~1.5s after
 * load, only for visitors who have never completed or dismissed a tour.
 * Mounted on the landing page and on /lookup (the post-login home). Becomes
 * a full-width bottom sheet on small screens.
 */
export function TourPrompt() {
  const { status, isTourActive, startTour, dismissPrompt } = useTour();
  const [visible, setVisible] = useState(false);

  const eligible = status === null && !isTourActive;

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [eligible]);

  if (!eligible || !visible) return null;

  return (
    <aside
      data-tour-prompt
      role="complementary"
      aria-label="Guided tour offer"
      className="fixed inset-x-3 bottom-3 z-[70] rounded-xl border border-primary/30 bg-card/95 p-4 shadow-[0_22px_60px_-22px_rgba(0,0,0,0.85)] backdrop-blur-md motion-safe:fade-rise sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm"
    >
      <button
        type="button"
        aria-label="Dismiss tour offer"
        onClick={dismissPrompt}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-2 text-primary">
        <Compass className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">New here?</span>
      </div>
      <p className="mt-2 pr-6 font-serif text-lg font-semibold leading-snug">
        Take a guided tour of GOGETTER
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        A hands-on walkthrough with sample data — see how the score, the Reliability Index, and the
        AI advisor keep you out of bad cars.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => startTour("quick")}>
          <Sparkles className="size-3.5" /> Quick tour · 2 min
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent"
          onClick={() => startTour("full")}
        >
          Full tour · 5 min
        </Button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          No thanks
        </button>
      </div>
    </aside>
  );
}
