import { NavBar } from "@/components/NavBar";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ALL_BODY_STYLES,
  ALL_FUELS,
  ALL_SELLER_TYPES,
  formatUSD,
  type BodyStyle,
  type FuelKind,
  type SellerType,
  type RankedMatch,
  type SearchResult,
} from "@/lib/inventory";
import {
  Car,
  Compass,
  Gauge,
  MapPin,
  Scale,
  Search,
  Sparkles,
  Leaf,
  Store,
  Heart,
  GitCompareArrows,
  Tag,
  BellPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const BODY_HINTS: Record<BodyStyle, string> = {
  Sedan: "Comfort & efficiency",
  SUV: "Space & all-weather",
  Truck: "Hauling & towing",
  Coupe: "Sporty 2-door",
  Hatchback: "Compact & practical",
  Minivan: "Family hauler",
  Convertible: "Open-top fun",
  Wagon: "Cargo + car-like",
};

type Condition = "New" | "Used" | "Any";

export default function FindMyCar() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [condition, setCondition] = useState<Condition>("Used");
  const [maxPrice, setMaxPrice] = useState(20000);
  const [zip, setZip] = useState("");
  const [maxDistance, setMaxDistance] = useState(25);
  const [maxMileage, setMaxMileage] = useState(100000);
  const [bodyStyles, setBodyStyles] = useState<BodyStyle[]>([]);
  const [fuels, setFuels] = useState<FuelKind[]>([]);
  const [sellerTypes, setSellerTypes] = useState<SellerType[]>([]);
  const [priceVsReliability, setPriceVsReliability] = useState(50);
  const [efficiencyPriority, setEfficiencyPriority] = useState(50);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const facets = trpc.find.facets.useQuery();
  const search = trpc.find.search.useMutation({
    onSuccess: (data) => {
      setResult(data as SearchResult);
      setSavedIds(new Set());
    },
    onError: (e) => toast.error(e.message || "Search failed"),
  });

  const saveMatch = trpc.find.saveMatch.useMutation({
    onError: (e) => toast.error(e.message || "Could not save"),
  });
  const saveShortlist = trpc.find.saveShortlist.useMutation({
    onError: (e) => toast.error(e.message || "Could not save shortlist"),
  });
  const saveSearch = trpc.find.saveSearch.useMutation({
    onSuccess: (res) =>
      toast.success(`Saved "${res.name}" — we'll alert you when new matches appear`),
    onError: (e) => toast.error(e.message || "Could not save search"),
  });

  const isNew = condition === "New";

  const toggleBody = (b: BodyStyle) =>
    setBodyStyles((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const toggleFuel = (f: FuelKind) =>
    setFuels((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const toggleSeller = (s: SellerType) =>
    setSellerTypes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const zipValid = /^\d{5}$/.test(zip);

  const buildCriteria = () => ({
    condition,
    maxPrice,
    zip: zipValid ? zip : undefined,
    maxDistance,
    maxMileage,
    bodyStyles,
    fuels,
    sellerTypes,
    priceVsReliability,
    efficiencyPriority,
    limit: 5,
  });

  const runSearch = () => {
    if (zip.length > 0 && !zipValid) {
      toast.error("Enter a valid 5-digit ZIP code, or leave it blank.");
      return;
    }
    search.mutate(buildCriteria());
  };

  const onSaveSearch = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save searches and get new-match alerts.");
      return;
    }
    if (zip.length > 0 && !zipValid) {
      toast.error("Enter a valid 5-digit ZIP code, or leave it blank.");
      return;
    }
    saveSearch.mutate({ criteria: buildCriteria() });
  };

  const onSaveMatch = (m: RankedMatch) => {
    if (!isAuthenticated) {
      toast.error("Sign in to save cars to your Garage.");
      return;
    }
    saveMatch.mutate(
      { listingId: m.listing.id },
      {
        onSuccess: () => {
          setSavedIds((prev) => new Set(prev).add(m.listing.id));
          toast.success(`Saved ${m.listing.year} ${m.listing.make} ${m.listing.model} to your Garage`);
        },
      },
    );
  };

  const onSaveAll = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save cars to your Garage.");
      return;
    }
    if (!result || result.matches.length === 0) return;
    const ids = result.matches.map((m) => m.listing.id);
    saveShortlist.mutate(
      { listingIds: ids },
      {
        onSuccess: (res) => {
          setSavedIds(new Set(ids));
          toast.success(`Saved ${res.saved} cars to your Garage`);
        },
      },
    );
  };

  const compareMatches = useMemo(() => result?.matches.slice(0, 3) ?? [], [result]);
  const onCompare = () => {
    if (compareMatches.length < 2) {
      toast.error("Need at least two matches to compare.");
      return;
    }
    const vins = compareMatches.map((m) => m.listing.vin).join(",");
    navigate(`/compare?vins=${encodeURIComponent(vins)}`);
  };

  const tradeoffLabel =
    priceVsReliability >= 66
      ? "Reliability first"
      : priceVsReliability <= 33
        ? "Price first"
        : "Balanced";

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-10">
          <div className="flex items-center gap-2 text-primary">
            <Compass className="size-5" />
            <span className="text-xs font-medium uppercase tracking-[0.2em]">Find My Car</span>
          </div>
          <h1 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Tell us what you need. We'll surface the few cars worth your time.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Instead of combing through thousands of listings across hundreds of dealer sites, set your
            criteria once. GOGETTER scans local inventory — new and used, from franchise dealers,
            independents, and private sellers — and returns a short, ranked shortlist, each with a
            plain-English breakdown of why it fits and what to watch for.
          </p>
        </div>
      </section>

      <div className="container grid gap-8 py-8 lg:grid-cols-[380px_1fr]">
        {/* Criteria panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="space-y-6 p-5">
              {/* Condition: New / Used / Any */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <Tag className="size-4 text-primary" /> Condition
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Used", "New", "Any"] as Condition[]).map((c) => {
                    const active = condition === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCondition(c)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {isNew && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    New cars have no history — we rank on model reputation, warranty, price vs. MSRP, and efficiency.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Gauge className="size-4 text-primary" /> Budget (max)
                  </Label>
                  <span className="text-sm font-semibold">{formatUSD(maxPrice)}</span>
                </div>
                <Slider
                  value={[maxPrice]}
                  min={4000}
                  max={70000}
                  step={500}
                  onValueChange={(v) => setMaxPrice(v[0])}
                />
              </div>

              {/* ZIP + distance */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4 text-primary" /> Your location
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="ZIP code"
                    inputMode="numeric"
                    className="h-9 w-28"
                  />
                  <span className="text-xs text-muted-foreground">
                    {zipValid ? "Distances from your ZIP" : "Optional — improves distance"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Within</span>
                  <span className="text-sm font-semibold">{maxDistance} mi</span>
                </div>
                <Slider
                  value={[maxDistance]}
                  min={5}
                  max={150}
                  step={5}
                  onValueChange={(v) => setMaxDistance(v[0])}
                />
              </div>

              {/* Max mileage (used only) */}
              {!isNew && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <Gauge className="size-4 text-primary" /> Max mileage
                    </Label>
                    <span className="text-sm font-semibold">{maxMileage.toLocaleString()} mi</span>
                  </div>
                  <Slider
                    value={[maxMileage]}
                    min={20000}
                    max={150000}
                    step={5000}
                    onValueChange={(v) => setMaxMileage(v[0])}
                  />
                </div>
              )}

              {/* Seller type */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <Store className="size-4 text-primary" /> Seller type
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SELLER_TYPES.map((s) => {
                    const active = sellerTypes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSeller(s)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body styles */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <Car className="size-4 text-primary" /> Body style
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_BODY_STYLES.map((b) => {
                    const active = bodyStyles.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBody(b)}
                        title={BODY_HINTS[b]}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fuel */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <Leaf className="size-4 text-primary" /> Fuel type
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_FUELS.map((f) => {
                    const active = fuels.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFuel(f)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price vs reliability */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Scale className="size-4 text-primary" /> Price vs. reliability
                  </Label>
                  <Badge variant="outline" className="bg-transparent text-[10px]">{tradeoffLabel}</Badge>
                </div>
                <Slider
                  value={[priceVsReliability]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setPriceVsReliability(v[0])}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Best price</span>
                  <span>Most reliable</span>
                </div>
              </div>

              {/* Efficiency priority */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Leaf className="size-4 text-primary" /> Fuel-efficiency priority
                  </Label>
                  <span className="text-sm font-semibold">{efficiencyPriority}</span>
                </div>
                <Slider
                  value={[efficiencyPriority]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setEfficiencyPriority(v[0])}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Doesn't matter</span>
                  <span>Very important</span>
                </div>
              </div>

              <Button onClick={runSearch} disabled={search.isPending} className="w-full gap-2">
                {search.isPending ? <Spinner className="size-4" /> : <Search className="size-4" />}
                {search.isPending ? "Scanning inventory…" : "Find my matches"}
              </Button>
              {facets.data && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Scanning {facets.data.total} local listings · {facets.data.usedCount} used · {facets.data.newCount} new
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <main className="min-w-0 space-y-4">
          {!result && !search.isPending && (
            <Card className="border-dashed border-border/60 bg-card/30">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Compass className="size-7 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold">Your shortlist appears here</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Set your budget, location, and priorities on the left, then let GOGETTER do the digging.
                  You'll get the best 4–5 cars to actually go test drive.
                </p>
              </CardContent>
            </Card>
          )}

          {search.isPending && (
            <Card className="border-border/60 bg-card/40">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Spinner className="size-8" />
                <p className="text-sm text-muted-foreground">
                  Scanning local inventory, scoring matches, and writing your recommendations…
                </p>
              </CardContent>
            </Card>
          )}

          {result && !search.isPending && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="size-4 text-primary" />
                  <span className="font-medium">{result.shortlisted} best matches</span>
                  <span className="text-muted-foreground">
                    from {result.eligible} eligible · {result.scanned} scanned
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.zipApplied ? "Distances from your ZIP · " : ""}Ranked by your priorities ({tradeoffLabel.toLowerCase()})
                </span>
              </div>

              {result.matches.length === 0 ? (
                <Card className="border-dashed border-border/60 bg-card/30">
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <h3 className="font-serif text-xl font-semibold">No cars matched those filters</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Try widening your budget, distance, or mileage — or clearing a body-style, fuel, or seller filter.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Results action bar: save all + compare */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {isAuthenticated
                        ? "Save cars to your Garage or compare your top picks side by side."
                        : "Sign in to save these cars to your Garage."}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 bg-transparent"
                        disabled={saveSearch.isPending}
                        onClick={onSaveSearch}
                      >
                        {saveSearch.isPending ? <Spinner className="size-3.5" /> : <BellPlus className="size-3.5" />}
                        Save this search
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 bg-transparent"
                        disabled={saveShortlist.isPending}
                        onClick={onSaveAll}
                      >
                        {saveShortlist.isPending ? <Spinner className="size-3.5" /> : <Heart className="size-3.5" />}
                        Save all to Garage
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={compareMatches.length < 2}
                        onClick={onCompare}
                      >
                        <GitCompareArrows className="size-3.5" />
                        Compare top {compareMatches.length}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.matches.map((m, i) => (
                      <MatchCard
                        key={m.listing.id}
                        match={m}
                        rank={i + 1}
                        isTop={i === 0}
                        onSave={onSaveMatch}
                        saved={savedIds.has(m.listing.id)}
                        saving={saveMatch.isPending}
                      />
                    ))}
                    <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
                      Recommendations are generated from local inventory specs and reliability heuristics. Vehicle
                      history (accidents, title, ownership) is unverified — confirm with a Carfax or CarGurus report
                      on GOGETTER Premium before purchase.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
