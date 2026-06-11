import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { TourPrompt } from "@/tour/TourPrompt";
import { VinSearchForm } from "@/components/VinSearchForm";
import { VehicleResult } from "@/components/VehicleResult";
import { AdvisorChat } from "@/components/AdvisorChat";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { LANDING_VIDEOS, LANDING_POSTER } from "@/lib/landingVideos";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import type { DecodeResult } from "@/lib/vehicle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, Database, Gauge, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const HERO_IMG = "/img/hero-car.svg";

const FEATURES = [
  { icon: Database, title: "Decode any VIN", desc: "Full specs from the free NHTSA database — make, engine, drivetrain, safety, and more." },
  { icon: Gauge, title: "Instant quality score", desc: "A transparent 0–100 rating from reliability, safety, age, mileage, and efficiency." },
  { icon: MessageSquare, title: "AI buying advisor", desc: "Chat with an expert that explains the score and tells you what to inspect." },
  { icon: ShieldCheck, title: "Track your shortlist", desc: "Save vehicles to your garage and revisit your full search history any time." },
];

export default function Lookup() {
  const { isAuthenticated, loading } = useAuth();
  // Cinematic b-roll only for logged-out visitors; once signed in, the hero
  // settles to a calm static background.
  const showVideo = !isAuthenticated && !loading;
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const advisorRef = useRef<HTMLDivElement>(null);

  const decode = trpc.vehicle.decode.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setSaved(false);
      setShowAdvisor(false);
    },
    onError: (err) => toast.error("Could not decode VIN", { description: err.message }),
  });

  const saveMutation = trpc.vehicle.save.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Saved to your Garage");
    },
    onError: (err) => toast.error("Could not save", { description: err.message }),
  });

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    if (showAdvisor && advisorRef.current) {
      advisorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAdvisor]);

  const handleSave = () => {
    if (!isAuthenticated) {
      toast("Sign in to save vehicles", {
        description: "Create a free account to build your garage and history.",
        action: { label: "Sign in", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (!result) return;
    saveMutation.mutate({
      vehicle: result.vehicle,
      score: result.score,
      mileage: result.mileage ?? undefined,
    });
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        {showVideo ? (
          <BackgroundVideo
            videos={LANDING_VIDEOS}
            poster={LANDING_POSTER}
            className="z-0"
            overlayClassName="bg-transparent"
          />
        ) : (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${HERO_IMG})` }}
          />
        )}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="container relative z-10 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary motion-safe:fade-rise">
              <Sparkles className="size-3.5" /> AI-powered used-car intelligence
            </div>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] tracking-tight motion-safe:fade-rise sm:text-6xl [animation-delay:90ms]">
              Buy your next used car with <span className="text-gold-gradient">confidence</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground motion-safe:fade-rise [animation-delay:180ms]">
              Enter a VIN to instantly decode the full vehicle profile, get a clear quality score, and ask our AI
              advisor exactly what to look for — before you ever step onto the lot.
            </p>
          </div>

          <Card
            data-tour="vin-form"
            className="glass mt-10 max-w-3xl border-border/70 motion-safe:fade-rise [animation-delay:260ms]"
          >
            <CardContent className="p-6 sm:p-7">
              <VinSearchForm
                onSubmit={(vin, mileage) => decode.mutate({ vin, mileage })}
                isLoading={decode.isPending}
              />
            </CardContent>
          </Card>

          <div className="mt-5 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <Compass className="size-4 text-primary" />
            <span>Don't have a VIN yet and just shopping?</span>
            <Link href="/find">
              <Button variant="link" className="h-auto gap-1 p-0 text-primary">
                Tell us your budget &amp; needs and get a shortlist
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section ref={resultRef} className="container scroll-mt-20 py-12">
          <VehicleResult
            result={result}
            onAskAdvisor={() => setShowAdvisor(true)}
            onSave={handleSave}
            isSaved={saved}
            isSaving={saveMutation.isPending}
          />
          {showAdvisor && (
            <div ref={advisorRef} className="mt-10 scroll-mt-20">
              <h3 className="mb-4 font-serif text-2xl font-semibold">AI Advisor</h3>
              <AdvisorChat result={result} />
            </div>
          )}
        </section>
      )}

      {/* Features */}
      {!result && (
        <section className="container py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="card-lift border-border/60">
                <CardContent className="p-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/25">
                    <f.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <SiteFooter compact />
      {/* Post-login tour offer (same visibility rules as the landing page) */}
      <TourPrompt />
    </div>
  );
}
