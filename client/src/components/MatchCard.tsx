import type { RankedMatch } from "@/lib/inventory";
import { formatUSD, matchColor, coverPhoto, hasDealerPhotos, sellerBadge } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactSellerDialog } from "@/components/ContactSellerDialog";
import { AdvisoryCallout } from "@/components/AdvisoryCallout";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  MapPin,
  Gauge,
  Fuel,
  Trophy,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Camera,
  Heart,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";

type MatchCardProps = {
  match: RankedMatch;
  rank: number;
  isTop?: boolean;
  onSave?: (match: RankedMatch) => void;
  saved?: boolean;
  saving?: boolean;
};

function FitBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 85 ? "bg-emerald-400" : value >= 70 ? "bg-primary" : value >= 55 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function MatchCard({ match, rank, isTop, onSave, saved, saving }: MatchCardProps) {
  const { listing: l, narrative, fit } = match;
  const fuelLabel = l.fuel === "EV" ? `${l.mpg} MPGe` : `${l.mpg} mpg`;
  const cover = coverPhoto(l);
  const dealerPhotos = hasDealerPhotos(l);
  const seller = sellerBadge(l.sellerType);
  const isNew = l.condition === "New";

  return (
    <Card className="card-lift overflow-hidden border-border/60 bg-card/60 backdrop-blur">
      <div className="grid gap-0 md:grid-cols-[300px_1fr]">
        {/* Image + rank */}
        <div className="relative min-h-[200px] bg-gradient-to-br from-muted/40 to-background">
          {cover && (
            <img src={cover.url} alt={`${l.make} ${l.model}`} className="h-full w-full object-cover" loading="lazy" />
          )}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-background/90 text-xs font-semibold ring-1 ring-border">
              {rank}
            </span>
            {isTop && (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <Trophy className="size-3" /> Best match
              </Badge>
            )}
            {isNew && (
              <Badge className="gap-1 bg-emerald-500 text-white">
                <BadgeCheck className="size-3" /> New
              </Badge>
            )}
          </div>
          {/* Photo provenance badge */}
          <div className="absolute right-3 top-3">
            {dealerPhotos ? (
              <Badge className="gap-1 border-emerald-500/40 bg-emerald-500/90 text-[10px] text-white">
                <Camera className="size-3" /> Dealer photos
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-border bg-background/85 text-[10px] text-muted-foreground">
                <Camera className="size-3" /> {cover?.source === "stock" ? "Stock image" : "Photo pending"}
              </Badge>
            )}
          </div>
          <div className="absolute bottom-3 left-3 rounded-lg bg-background/85 px-2.5 py-1.5 backdrop-blur">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</div>
            <div className={`text-xl font-bold tabular-nums ${matchColor(match.matchScore)}`}>
              {match.matchScore}
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`text-[10px] ${seller.tone}`}>
                  {seller.label}
                </Badge>
                {match.trust?.level === "approved" && (
                  <Badge className="gap-1 border-primary/40 bg-primary/15 text-[10px] text-primary" variant="outline">
                    <BadgeCheck className="size-3" /> GOGETTER Approved
                  </Badge>
                )}
                {match.advisories?.some((a) => a.severity === "value-pick") && (
                  <Badge className="gap-1 border-emerald-500/40 bg-emerald-500/15 text-[10px] text-emerald-300" variant="outline">
                    <Trophy className="size-3" /> Value Pick
                  </Badge>
                )}
                {l.sellerTenure && (
                  <span className="text-[10px] text-muted-foreground">{l.sellerTenure}</span>
                )}
              </div>
              <h3 className="font-serif text-xl font-semibold leading-tight">
                {l.year} {l.make} {l.model}
              </h3>
              <p className="text-sm text-muted-foreground">
                {l.trim} · {l.exteriorColor}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-2xl font-bold text-foreground">{formatUSD(l.price)}</div>
              {isNew && l.msrp && (
                <div className="text-[11px] text-muted-foreground">MSRP {formatUSD(l.msrp)}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Quality {match.qualityScore} ({match.qualityGrade})
              </div>
              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saved || saving}
                  onClick={() => onSave(match)}
                  className={`mt-1 h-7 gap-1.5 bg-transparent text-xs ${saved ? "border-primary/40 text-primary" : ""}`}
                >
                  <Heart className={`size-3.5 ${saved ? "fill-primary text-primary" : ""}`} />
                  {saved ? "Saved" : "Save"}
                </Button>
              )}
            </div>
          </div>

          {/* Quick facts */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gauge className="size-3.5" /> {isNew ? "New · delivery miles" : `${l.mileage.toLocaleString()} mi`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Fuel className="size-3.5" /> {l.fuel} · {fuelLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {l.distanceMiles} mi · {l.dealerName}
            </span>
            <Badge variant="outline" className="bg-transparent text-[10px]">
              {l.bodyStyle}
            </Badge>
          </div>

          {/* New-car: warranty + reputation instead of history */}
          {isNew && (l.warranty || l.modelReputation) && (
            <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              {l.warranty && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <ShieldCheck className="size-3.5" /> Warranty: {l.warranty}
                </div>
              )}
              {l.modelReputation && (
                <p className="text-[11px] leading-snug text-muted-foreground">{l.modelReputation}</p>
              )}
            </div>
          )}

          {/* Regional / history red-flag warnings */}
          {l.regionFlags && l.regionFlags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                <ShieldAlert className="size-3.5" /> Heads up:
              </span>
              {l.regionFlags.map((flag) => (
                <Badge
                  key={flag}
                  variant="outline"
                  className="border-amber-400/40 bg-amber-400/10 text-[10px] font-normal text-amber-300"
                >
                  {flag}
                </Badge>
              ))}
            </div>
          )}

          {/* Curated knowledge: known defects, cautions, value picks */}
          <AdvisoryCallout
            advisories={match.advisories}
            riskLevel={match.riskLevel}
            trust={match.trust}
            className="mt-3"
          />

          {/* Fit bars */}
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
            <FitBar label="Price" value={fit.price} />
            <FitBar label="Reliability" value={fit.reliability} />
            <FitBar label="Efficiency" value={fit.efficiency} />
            <FitBar label="Mileage" value={fit.mileage} />
            <FitBar label="Distance" value={fit.distance} />
          </div>

          {/* CTA: contact the seller + full VIN report */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
            <span className="font-mono text-[11px] text-muted-foreground">VIN {l.vin}</span>
            <div className="flex flex-wrap items-center gap-2">
              <ContactSellerDialog
                listingId={l.id}
                vin={l.vin}
                vehicle={`${l.year} ${l.make} ${l.model}`}
                sellerType={l.sellerType}
              />
              <Link href={`/vehicle/${l.vin}${l.mileage ? `?mileage=${l.mileage}` : ""}`}>
                <Button size="sm" variant="outline" className="gap-1.5 bg-transparent">
                  View full report
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Narrative */}
          {narrative && (
            <>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" /> Why we picked this
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{narrative.whyPicked}</p>
              </div>

              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    Advantages, trade-offs & what to watch for
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <NarrativeList
                        icon={<CheckCircle2 className="size-3.5 text-emerald-400" />}
                        title="Advantages"
                        items={narrative.advantages}
                      />
                      <NarrativeList
                        icon={<AlertTriangle className="size-3.5 text-amber-400" />}
                        title="Trade-offs"
                        items={narrative.disadvantages}
                      />
                      <NarrativeList
                        icon={<Eye className="size-3.5 text-primary" />}
                        title="What to watch for"
                        items={narrative.watchFor}
                      />
                    </div>
                    {l.regionFlags && l.regionFlags.length > 0 && (
                      <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                        Regional/history notes are <span className="font-medium">unverified</span> heuristics. Confirm
                        with a Carfax or CarGurus history report (GOGETTER Premium) before purchase.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function NarrativeList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        {icon} {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs leading-snug text-muted-foreground">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
