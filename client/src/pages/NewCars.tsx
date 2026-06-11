import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { TrimConfigurator } from "@/components/TrimConfigurator";
import { trpc } from "@/lib/trpc";
import {
  ALL_BODY_STYLES,
  ALL_FUELS,
  formatUSD,
  coverPhoto,
  hasDealerPhotos,
  type BodyStyle,
  type FuelKind,
} from "@/lib/inventory";
import {
  Sparkles,
  ShieldCheck,
  Leaf,
  Gauge,
  ArrowRight,
  BadgeCheck,
  Camera,
  Car,
  Star,
  Tag,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

type SortKey = "reputation" | "price" | "efficiency";

export default function NewCars() {
  const [bodyStyles, setBodyStyles] = useState<BodyStyle[]>([]);
  const [fuels, setFuels] = useState<FuelKind[]>([]);
  const [sort, setSort] = useState<SortKey>("reputation");

  const { data, isLoading } = trpc.find.newCars.useQuery({ bodyStyles, fuels, sort });

  const toggleBody = (b: BodyStyle) =>
    setBodyStyles((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const toggleFuel = (f: FuelKind) =>
    setFuels((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <div className="min-h-screen">
      <NavBar />

      <PageHero
        tone="emerald"
        eyebrow="New Cars"
        icon={<BadgeCheck className="size-4" />}
        title="Shopping new? Buy on reputation, warranty, and value — not history."
        description="New cars have no accident or ownership history to check. So GOGETTER evaluates them differently: model reputation and reliability track record, factory warranty, fuel efficiency, and price against MSRP."
      />

      <div className="container py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Car className="size-3.5" /> Body
            </span>
            {ALL_BODY_STYLES.map((b) => {
              const active = bodyStyles.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBody(b)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                      : "border-border text-muted-foreground hover:border-emerald-500/50"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Leaf className="size-3.5" /> Fuel
            </span>
            {ALL_FUELS.map((f) => {
              const active = fuels.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFuel(f)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                      : "border-border text-muted-foreground hover:border-emerald-500/50"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Sort</span>
            {(
              [
                ["reputation", "Reputation"],
                ["price", "Price"],
                ["efficiency", "Efficiency"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                  sort === key
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-border text-muted-foreground hover:border-emerald-500/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Spinner className="size-6" /> Loading new models…
          </div>
        )}

        {data && data.models.length === 0 && (
          <Card className="border-dashed border-border/60 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <h3 className="font-serif text-xl font-semibold">No new models match those filters</h3>
              <p className="max-w-md text-sm text-muted-foreground">Try clearing a body-style or fuel filter.</p>
            </CardContent>
          </Card>
        )}

        {data && data.models.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.models.map((m) => {
              const rep = m.trims[0];
              const cover = rep && rep.photos && rep.photos.length > 0 ? rep.photos[0] : null;
              const dealerPhotos = !!rep?.photos?.some((p) => p.source === "dealer");
              const fuelLabel = m.fuel === "EV" ? `${m.mpg} MPGe` : `${m.mpg} mpg`;
              return (
                <Card key={m.key} className="flex flex-col overflow-hidden border-border/60 bg-card/60 backdrop-blur">
                  <div className="relative h-44 bg-gradient-to-br from-muted/40 to-background">
                    {cover && (
                      <img src={cover.url} alt={`${m.make} ${m.model}`} className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <Badge className="gap-1 bg-emerald-500 text-white">
                        <BadgeCheck className="size-3" /> New
                      </Badge>
                      <Badge variant="outline" className="bg-background/85 text-[10px]">{m.bodyStyle}</Badge>
                    </div>
                    <div className="absolute right-3 top-3">
                      {dealerPhotos ? (
                        <Badge className="gap-1 bg-emerald-500/90 text-[10px] text-white">
                          <Camera className="size-3" /> Dealer photos
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-background/85 text-[10px] text-muted-foreground">
                          <Camera className="size-3" /> Stock image
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-semibold leading-tight">
                          {m.make} {m.model}
                        </h3>
                        <p className="text-xs text-muted-foreground">{m.trims.length} trim{m.trims.length > 1 ? "s" : ""} available</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                        <Star className="size-3.5" /> {m.qualityScore} ({m.qualityGrade})
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="size-3.5" /> From {formatUSD(m.fromPrice)}
                      </span>
                      {m.msrp && (
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="size-3.5" /> MSRP {formatUSD(m.msrp)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Leaf className="size-3.5" /> {fuelLabel}
                      </span>
                    </div>

                    {m.warranty && (
                      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
                        <ShieldCheck className="size-3.5" /> {m.warranty}
                      </div>
                    )}
                    {m.modelReputation && (
                      <p className="mt-2 flex-1 text-[11px] leading-snug text-muted-foreground">
                        <Sparkles className="mr-1 inline size-3 text-emerald-400" />
                        {m.modelReputation}
                      </p>
                    )}

                    <div className="mt-4 space-y-2">
                      <TrimConfigurator make={m.make} model={m.model} trims={m.trims} />
                      {rep && (
                        <Link href={`/vehicle/${rep.vin}`}>
                          <Button size="sm" variant="ghost" className="w-full gap-1.5 text-muted-foreground">
                            View full report &amp; ask the advisor
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter compact />
    </div>
  );
}
