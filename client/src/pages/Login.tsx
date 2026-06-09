import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { LANDING_VIDEOS, LANDING_POSTER } from "@/lib/landingVideos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

const HIGHLIGHTS = [
  "Transparent 0–100 quality score for any VIN",
  "A tailored shortlist from local new & used inventory",
  "Price-drop alerts and ready-to-send seller messages",
];

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, refresh } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome, ${data.name}`);
      refresh();
      navigate("/");
    },
    onError: (err) => toast.error(err.message || "Sign in failed"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    demoLogin.mutate({ username: username.trim(), password });
  };

  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <BackgroundVideo videos={LANDING_VIDEOS} poster={LANDING_POSTER} />

      {/* Brand bar */}
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30 backdrop-blur">
            <Gauge className="size-5 text-primary" />
          </div>
          <div className="leading-none">
            <span className="block font-serif text-lg font-semibold tracking-tight">GOGETTER</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Car Advisor
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Explore the demo →
        </Button>
      </header>

      {/* Hero + sign-in */}
      <main className="container flex flex-1 items-center">
        <div className="grid w-full items-center gap-10 py-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="size-3.5" /> AI-powered used-car intelligence
            </span>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] sm:text-5xl">
              Find the <span className="text-gold-gradient">few cars</span> worth your time.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Decode any VIN, score it on reliability, safety and value, and let the GOGETTER advisor
              surface the best matches near you — new or used, dealer or private seller.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {HIGHLIGHTS.map((f) => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Sign-in card */}
          <div className="mx-auto w-full max-w-sm">
            <div className="glass rounded-2xl border border-border/60 p-6 shadow-2xl">
              <h2 className="font-serif text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the demo account to explore instantly — no setup required.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin"
                    autoComplete="current-password"
                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Demo credentials:{" "}
                  <span className="font-medium text-foreground">admin</span> /{" "}
                  <span className="font-medium text-foreground">admin</span>
                </div>

                <Button type="submit" className="w-full" disabled={demoLogin.isPending}>
                  {demoLogin.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Enter the showroom"
                  )}
                </Button>
              </form>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Vehicle data via the free NHTSA vPIC database. Scores are advisory heuristics.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
