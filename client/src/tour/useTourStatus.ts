import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useRef, useState } from "react";

export type TourVariant = "quick" | "full";
export type TourStatusValue = {
  status: "completed" | "dismissed";
  variant: TourVariant;
  at: string;
};

const STORAGE_KEY = "gg-tour";

function readLocal(): TourStatusValue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourStatusValue;
    return parsed && (parsed.status === "completed" || parsed.status === "dismissed")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writeLocal(value: TourStatusValue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode quota etc.) — the prompt may reappear.
  }
}

/**
 * Tour completion/dismissal state with dual persistence:
 * anonymous → localStorage; signed-in → the account's `onboarding` column
 * (rides along `auth.me`), reconciled in both directions at login. The
 * SHARED demo account is exempt from server persistence (the server also
 * enforces this), so demo visitors don't inherit each other's state.
 */
export function useTourStatus() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const setOnboarding = trpc.auth.setOnboarding.useMutation();
  const [local, setLocal] = useState<TourStatusValue | null>(readLocal);

  const server: TourStatusValue | null = (user?.onboarding as TourStatusValue | null) ?? null;
  const status = server ?? local;

  const pushToServer = useCallback(
    (value: TourStatusValue) => {
      setOnboarding.mutate(
        { status: value.status, variant: value.variant },
        {
          onSuccess: (r) => {
            if (r.persisted) void utils.auth.me.invalidate();
          },
        },
      );
    },
    // The mutation object identity is stable enough for our use; mutate() is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [utils],
  );

  /** Record a completion/dismissal everywhere that applies. */
  const record = useCallback(
    (value: TourStatusValue) => {
      setLocal(value);
      writeLocal(value);
      if (isAuthenticated) pushToServer(value);
    },
    [isAuthenticated, pushToServer],
  );

  // Login reconciliation — once per signed-in user id.
  const reconciledForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (reconciledForRef.current === user.id) return;
    reconciledForRef.current = user.id;

    if (server) {
      // Server is authoritative for the account — mirror it down so the
      // browser stays quiet when signed out again.
      setLocal(server);
      writeLocal(server);
      return;
    }
    // Pre-login completion in this browser → attach it to the account.
    // Never for the shared demo login (would poison every demo visitor).
    const localState = readLocal();
    if (localState && user.loginMethod !== "demo") {
      pushToServer(localState);
    }
  }, [isAuthenticated, user, server, pushToServer]);

  return { status, record };
}
