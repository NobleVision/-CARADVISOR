import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { LiveMarketPanel } from "@/components/LiveMarketPanel";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ALL_BODY_STYLES,
  ALL_FUELS,
  ALL_SELLER_TYPES,
  formatUSD,
  type BodyStyle,
  type BuyerCriteria,
  type FuelKind,
  type SellerType,
  type RankedMatch,
  type SearchResult,
  type SearchSuggestion,
  type UseCase,
} from "@/lib/inventory";
import {
  Car,
  Compass,
  Gauge,
  Gem,
  MapPin,
  PiggyBank,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Leaf,
  Store,
  Heart,
  GitCompareArrows,
  Tag,
  BellPlus,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { TOUR_SEARCH_RESULT } from "@/tour/fixtures";
import { useTour } from "@/tour/TourProvider";

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
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(20000);
  const [locationText, setLocationText] = useState("");
  const [resolved, setResolved] = useState<{ query: string; zip: string; label: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [maxDistance, setMaxDistance] = useState(25);
  const [maxMileage, setMaxMileage] = useState(100000);
  const [bodyStyles, setBodyStyles] = useState<BodyStyle[]>([]);
  const [fuels, setFuels] = useState<FuelKind[]>([]);
  const [sellerTypes, setSellerTypes] = useState<SellerType[]>([]);
  const [priceVsReliability, setPriceVsReliability] = useState(50);
  const [efficiencyPriority, setEfficiencyPriority] = useState(50);

  // Hybrid natural-language search + Budget Buyer Mode
  const [searchText, setSearchText] = useState("");
  const [interpreted, setInterpreted] = useState<string[]>([]);
  const [useCase, setUseCase] = useState<UseCase | undefined>(undefined);
  const [makes, setMakes] = useState<string[]>([]);
  const [budgetMode, setBudgetMode] = useState(false);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Guided tour: show the sample shortlist (a live search would call the LLM
  // for narratives). Cleared when the tour ends, unless the user searched.
  const { isTourActive } = useTour();
  useEffect(() => {
    if (isTourActive) {
      setResult(TOUR_SEARCH_RESULT);
      setSavedIds(new Set());
    } else {
      setResult((prev) => (prev === TOUR_SEARCH_RESULT ? null : prev));
    }
  }, [isTourActive]);

  const utils = trpc.useUtils();
  const facets = trpc.find.facets.useQuery();
  const search = trpc.find.search.useMutation({
    onSuccess: (data) => {
      setResult(data as SearchResult);
      setSavedIds(new Set());
    },
    onError: (e) => toast.error(e.message || "Search failed"),
  });

  /** Apply a parsed criteria patch onto the visible filter controls. */
  const applyPatch = (patch: Partial<BuyerCriteria>): number => {
    let applied = 0;
    const clampN = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));
    if (patch.condition) { setCondition(patch.condition); applied++; }
    const nextMax = typeof patch.maxPrice === "number" ? clampN(patch.maxPrice, 4000, 70000) : maxPrice;
    if (typeof patch.maxPrice === "number") { setMaxPrice(nextMax); applied++; }
    if (typeof patch.minPrice === "number") { setMinPrice(clampN(Math.min(patch.minPrice, nextMax - 500), 0, 70000)); applied++; }
    if (patch.zip) { setLocationText(patch.zip); applied++; }
    if (typeof patch.maxDistance === "number") { setMaxDistance(clampN(patch.maxDistance, 5, 150)); applied++; }
    if (typeof patch.maxMileage === "number") { setMaxMileage(clampN(patch.maxMileage, 20000, 150000)); applied++; }
    if (patch.bodyStyles) { setBodyStyles(patch.bodyStyles); applied++; }
    if (patch.fuels) { setFuels(patch.fuels); applied++; }
    if (patch.sellerTypes) { setSellerTypes(patch.sellerTypes); applied++; }
    if (patch.makes) { setMakes(patch.makes); applied++; }
    if (typeof patch.priceVsReliability === "number") { setPriceVsReliability(clampN(patch.priceVsReliability, 0, 100)); applied++; }
    if (typeof patch.efficiencyPriority === "number") { setEfficiencyPriority(clampN(patch.efficiencyPriority, 0, 100)); applied++; }
    if (patch.budgetMode === true) { setBudgetMode(true); applied++; }
    return applied;
  };

  const parseIntent = trpc.find.parseIntent.useMutation({
    onSuccess: (r) => {
      const applied = applyPatch(r.criteriaPatch as Partial<BuyerCriteria>);
      setUseCase(r.useCase ?? undefined);
      setInterpreted(r.interpreted);
      if (applied > 0) {
        toast.success(`Set ${applied} filter${applied === 1 ? "" : "s"} from your description — review and adjust below.`);
      } else {
        toast.info("Couldn't extract filters from that — try mentioning a budget, distance, or body style.");
      }
    },
    onError: (e) => toast.error(e.message || "Couldn't interpret that"),
  });

  const onInterpret = () => {
    const text = searchText.trim();
    if (text.length < 3) {
      toast.error("Describe what you need first — budget, who it's for, how far you'll travel…");
      return;
    }
    parseIntent.mutate({ text });
  };

  const clearInterpretation = () => {
    setInterpreted([]);
    setUseCase(undefined);
    setMakes([]);
  };

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

  // Location accepts a 5-digit ZIP directly, or a city ("Fairfax" / "Austin, TX")
  // resolved to a representative ZIP server-side. Last resolution is cached so
  // repeat searches don't re-hit the resolver.
  const trimmedLocation = locationText.trim();
  const zipDirect = /^\d{5}$/.test(trimmedLocation);
  const effectiveZip = zipDirect
    ? trimmedLocation
    : resolved && resolved.query === trimmedLocation
      ? resolved.zip
      : undefined;

  /** Resolve the location box to a ZIP (toasting on failure). */
  const ensureZip = async (): Promise<{ ok: boolean; zip?: string }> => {
    if (!trimmedLocation) return { ok: true, zip: undefined };
    if (effectiveZip) return { ok: true, zip: effectiveZip };
    setResolving(true);
    try {
      const r = await utils.find.resolveLocation.fetch({ query: trimmedLocation });
      if (r.ok) {
        setResolved({ query: trimmedLocation, zip: r.zip, label: r.label });
        return { ok: true, zip: r.zip };
      }
      toast.error(r.message);
      return { ok: false };
    } catch {
      toast.error("Couldn't look up that location — try a 5-digit ZIP.");
      return { ok: false };
    } finally {
      setResolving(false);
    }
  };

  const buildCriteria = (zip?: string) => ({
    condition,
    maxPrice,
    minPrice: minPrice > 0 ? minPrice : undefined,
    zip,
    maxDistance,
    maxMileage,
    bodyStyles,
    fuels,
    sellerTypes,
    priceVsReliability,
    efficiencyPriority,
    limit: 5,
    searchText: searchText.trim() ? searchText.trim() : undefined,
    useCase,
    budgetMode: budgetMode || undefined,
    makes: makes.length ? makes : undefined,
  });

  /** Apply a zero-result suggestion and immediately re-run the search. */
  const applySuggestion = (s: SearchSuggestion) => {
    applyPatch(s.patch);
    search.mutate({ ...buildCriteria(effectiveZip), ...(s.patch as Partial<ReturnType<typeof buildCriteria>>) });
  };

  const runSearch = async () => {
    const loc = await ensureZip();
    if (!loc.ok) return;
    search.mutate(buildCriteria(loc.zip));
  };

  const onSaveSearch = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save searches and get new-match alerts.");
      return;
    }
    const loc = await ensureZip();
    if (!loc.ok) return;
    saveSearch.mutate({ criteria: buildCriteria(loc.zip) });
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
          <Card data-tour="criteria" className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="space-y-6 p-5">
              {/* Hybrid natural-language search */}
              <div data-tour="nl-search">
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <Wand2 className="size-4 text-primary" /> Describe what you need
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value.slice(0, 600))}
                  rows={3}
                  placeholder={'e.g. "A safe, efficient car under $7k for my 15-year-old new driver within 30 miles of 22030 — prefer Mazda or Honda"'}
                  className="resize-none text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full gap-1.5 bg-transparent"
                  disabled={parseIntent.isPending}
                  onClick={onInterpret}
                >
                  {parseIntent.isPending ? <Spinner className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  {parseIntent.isPending ? "Interpreting…" : "Interpret & set filters"}
                </Button>
                {interpreted.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {interpreted.map((chip) => (
                      <Badge
                        key={chip}
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-[10px] font-normal text-primary"
                      >
                        {chip}
                      </Badge>
                    ))}
                    <button
                      type="button"
                      onClick={clearInterpretation}
                      className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      clear
                    </button>
                  </div>
                )}
              </div>

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
                    <Gauge className="size-4 text-primary" /> Budget
                  </Label>
                  <span className="text-sm font-semibold">
                    {minPrice > 0 ? `${formatUSD(minPrice)} – ${formatUSD(maxPrice)}` : `Up to ${formatUSD(maxPrice)}`}
                  </span>
                </div>
                <Slider
                  value={[minPrice, maxPrice]}
                  min={0}
                  max={70000}
                  step={500}
                  minStepsBetweenThumbs={1}
                  onValueChange={(v) => {
                    setMinPrice(v[0]);
                    setMaxPrice(v[1]);
                  }}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Raise the lower end to skip suspiciously cheap listings.
                </p>
              </div>

              {/* Budget Buyer Mode — productizes the budget golden rules */}
              {!isNew && (
                <div data-tour="budget-mode" className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="budget-mode" className="flex items-center gap-1.5 text-sm">
                      <PiggyBank className="size-4 text-primary" /> Budget Buyer Mode
                    </Label>
                    <Switch id="budget-mode" checked={budgetMode} onCheckedChange={setBudgetMode} />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    Hides models with documented serious defects, boosts proven value picks, and weights
                    reliability heavily — because at budget prices, maintenance history beats brand name.
                  </p>
                </div>
              )}

              {/* Makes (set via the description above) */}
              {makes.length > 0 && (
                <div>
                  <Label className="mb-2 flex items-center gap-1.5 text-sm">
                    <Car className="size-4 text-primary" /> Makes
                    <span className="text-xs font-normal text-muted-foreground">(from your description)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {makes.map((mk) => (
                      <button
                        key={mk}
                        type="button"
                        onClick={() => setMakes((prev) => prev.filter((x) => x !== mk))}
                        className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs text-primary transition-colors hover:border-destructive hover:text-destructive"
                        title="Remove this make filter"
                      >
                        {mk} <X className="size-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Location (ZIP or city) + distance */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4 text-primary" /> Your location
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="ZIP or city, ST"
                    className="h-9 w-40"
                  />
                  <span className="text-xs text-muted-foreground">
                    {resolving
                      ? "Looking up…"
                      : zipDirect
                        ? "Distances from your ZIP"
                        : effectiveZip
                          ? `Using ZIP ${effectiveZip} (${resolved?.label})`
                          : "Optional — ZIP or city improves distance"}
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
        <main data-tour="results" className="min-w-0 space-y-4">
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
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Sparkles className="size-4 text-primary" />
                  <span className="font-medium">{result.shortlisted} best matches</span>
                  <span className="text-muted-foreground">
                    from {result.eligible} eligible · {result.scanned} scanned
                  </span>
                  {result.hiddenAvoidCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      <ShieldAlert className="size-3.5" />
                      {result.hiddenAvoidCount} known-trouble car{result.hiddenAvoidCount === 1 ? "" : "s"} hidden by Budget Buyer Mode
                    </span>
                  )}
                  {result.semanticApplied && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Wand2 className="size-3.5" />
                      AI semantic ranking applied
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.zipApplied ? "Distances from your ZIP · " : ""}Ranked by your priorities ({tradeoffLabel.toLowerCase()})
                </span>
              </div>

              {result.matches.length === 0 ? (
                <Card className="border-dashed border-border/60 bg-card/30">
                  <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <h3 className="font-serif text-xl font-semibold">No cars matched those filters</h3>
                    {result.suggestions.length > 0 ? (
                      <>
                        <p className="max-w-md text-sm text-muted-foreground">
                          One change would unlock real matches — each button below applies the change and
                          re-runs your search:
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {result.suggestions.map((s) => (
                            <Button
                              key={s.label}
                              size="sm"
                              variant="outline"
                              className="gap-1.5 bg-transparent"
                              disabled={search.isPending}
                              onClick={() => applySuggestion(s)}
                            >
                              {s.label}
                              <span className="text-[10px] text-emerald-400">+{s.unlocks}</span>
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="max-w-md text-sm text-muted-foreground">
                        Try widening your budget, distance, or mileage — or clearing a body-style, fuel, or seller filter.
                      </p>
                    )}
                    {result.valuePickAlternatives.length > 0 && (
                      <div className="w-full max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-left">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <Gem className="size-3.5" /> Curated value picks near your budget
                        </div>
                        <ul className="space-y-1.5">
                          {result.valuePickAlternatives.map((v) => (
                            <li key={v.listingId}>
                              <Link
                                href={`/vehicle/${v.vin}`}
                                className="flex items-center justify-between gap-2 text-xs text-foreground/90 underline-offset-2 hover:text-primary hover:underline"
                              >
                                <span>{v.label}</span>
                                <span className="font-medium">{formatUSD(v.price)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Proven budget choices from the GOGETTER Reliability Index, slightly outside your current filters.
                        </p>
                      </div>
                    )}
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

              {/* Real web listings for the same criteria (Brave; opt-in click) */}
              <LiveMarketPanel
                key={`${makes[0] ?? ""}|${maxPrice}|${effectiveZip ?? ""}|${condition}`}
                make={makes[0]}
                maxPrice={maxPrice}
                zip={effectiveZip}
                condition={condition}
              />
            </>
          )}
        </main>
      </div>
      <SiteFooter compact />
    </div>
  );
}
