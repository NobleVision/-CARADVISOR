import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import type { Driver } from "driver.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { FULL_STEPS, QUICK_STEPS, type TourStep, type TourStepContext } from "./steps";
import { useTourStatus, type TourStatusValue, type TourVariant } from "./useTourStatus";

type TourContextValue = {
  /** True while a guided tour is running — pages use this to swap in fixtures
   *  and suppress live network panels. */
  isTourActive: boolean;
  activeVariant: TourVariant | null;
  /** Completion/dismissal state (server-backed when signed in). */
  status: TourStatusValue | null;
  startTour: (variant: TourVariant) => void;
  /** Record a prompt dismissal so the slide-in card never nags again. */
  dismissPrompt: () => void;
};

const TourContext = createContext<TourContextValue>({
  isTourActive: false,
  activeVariant: null,
  status: null,
  startTour: () => {},
  dismissPrompt: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useTour(): TourContextValue {
  return useContext(TourContext);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** rAF-poll for a selector; resolves false on timeout so the tour never hangs. */
function waitForElement(selector: string, timeoutMs = 4000): Promise<boolean> {
  if (!selector) return Promise.resolve(true);
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (document.querySelector(selector)) return resolve(true);
      if (Date.now() - startedAt > timeoutMs) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

/**
 * Owns the driver.js lifecycle and the cross-route step engine. driver.js is
 * loaded lazily on the first startTour() so it costs the main bundle nothing;
 * it renders its own body-level overlay outside React's tree (StrictMode-safe
 * — no render-time side effects, explicit create/destroy).
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { isAuthenticated, refresh } = useAuth();
  const utils = trpc.useUtils();
  const { status, record } = useTourStatus();

  const [activeVariant, setActiveVariant] = useState<TourVariant | null>(null);
  const driverRef = useRef<Driver | null>(null);
  const stepsRef = useRef<TourStep[]>([]);
  const variantRef = useRef<TourVariant | null>(null);
  const endingRef = useRef(false);
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  const stepCtx: TourStepContext = useMemo(
    () => ({
      isAuthenticated: () => authRef.current,
      demoLogin: async () => {
        await utils.client.auth.demoLogin.mutate({ username: "admin", password: "admin" });
        await refresh();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [utils],
  );

  const endTour = useCallback(
    (completed: boolean) => {
      if (endingRef.current) return;
      endingRef.current = true;
      const variant = variantRef.current;
      if (variant) {
        record({
          status: completed ? "completed" : "dismissed",
          variant,
          at: new Date().toISOString(),
        });
      }
      const instance = driverRef.current;
      driverRef.current = null;
      stepsRef.current = [];
      variantRef.current = null;
      setActiveVariant(null);
      instance?.destroy();
      endingRef.current = false;
    },
    [record],
  );

  const advancingRef = useRef(false);
  const goToStep = useCallback(
    async (index: number) => {
      if (advancingRef.current) return; // ignore double-clicks mid-transition
      advancingRef.current = true;
      try {
        const steps = stepsRef.current;
        if (index < 0) return;
        if (index >= steps.length) {
          endTour(true);
          return;
        }
        const step = steps[index];
        try {
          await step.beforeEnter?.(stepCtx);
        } catch {
          // beforeEnter side effects are best-effort; the step still shows.
        }
        if (step.route && window.location.pathname !== step.route) {
          navigate(step.href ?? step.route);
        }
        if (step.target) await waitForElement(step.target);
        const instance = driverRef.current;
        if (!instance) return;
        if (instance.isActive()) instance.moveTo(index);
        else instance.drive(index);
      } finally {
        advancingRef.current = false;
      }
    },
    [endTour, navigate, stepCtx],
  );

  const startTour = useCallback(
    (variant: TourVariant) => {
      if (driverRef.current) return; // a tour is already running
      void (async () => {
        const [{ driver }] = await Promise.all([
          import("driver.js"),
          import("driver.js/dist/driver.css"),
          import("./driver-theme.css"),
        ]);
        const steps = variant === "quick" ? QUICK_STEPS : FULL_STEPS;
        stepsRef.current = steps;
        variantRef.current = variant;
        setActiveVariant(variant);

        driverRef.current = driver({
          showProgress: true,
          progressText: "{{current}} of {{total}}",
          allowClose: true,
          animate: !prefersReducedMotion(),
          smoothScroll: true,
          stagePadding: 8,
          stageRadius: 12,
          overlayOpacity: 0.72,
          popoverClass: "gg-tour-popover",
          nextBtnText: "Next →",
          prevBtnText: "← Back",
          doneBtnText: "Finish",
          steps: steps.map((s) => ({
            element: s.target || undefined,
            popover: {
              title: s.title,
              description: s.body,
              side: s.side,
              align: s.align ?? "start",
            },
          })),
          // Manual advancement: we navigate/seed/login first, then move.
          onNextClick: () => {
            void goToStep((driverRef.current?.getActiveIndex() ?? 0) + 1);
          },
          onPrevClick: () => {
            void goToStep((driverRef.current?.getActiveIndex() ?? 0) - 1);
          },
          // ESC / overlay / ✕ — record a dismissal (never nag again).
          onDestroyStarted: () => {
            endTour(false);
          },
        });
        await goToStep(0);
      })();
    },
    [endTour, goToStep],
  );

  const dismissPrompt = useCallback(() => {
    record({ status: "dismissed", variant: "quick", at: new Date().toISOString() });
  }, [record]);

  // App teardown: drop the overlay without recording anything.
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      isTourActive: activeVariant !== null,
      activeVariant,
      status,
      startTour,
      dismissPrompt,
    }),
    [activeVariant, status, startTour, dismissPrompt],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
