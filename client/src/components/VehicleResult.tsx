import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreGauge, SubscoreBar } from "@/components/ScoreGauge";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { specRows, vehicleTitle, type DecodeResult } from "@/lib/vehicle";
import { BadgeCheck, Bookmark, BookmarkCheck, Lightbulb, MessageSquare, ShieldCheck } from "lucide-react";

type Props = {
  result: DecodeResult;
  onAskAdvisor?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  /** Where the decoded data came from, controls the provenance label. */
  source?: "nhtsa" | "inventory";
};

export function VehicleResult({ result, onAskAdvisor, onSave, isSaved, isSaving, source = "nhtsa" }: Props) {
  const { vehicle, score, mileage } = result;
  const rows = specRows(vehicle);

  return (
    <div className="space-y-6">
      {/* Header band */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <BadgeCheck className="size-3.5 text-primary" />{" "}
            {source === "inventory" ? "Local dealer listing · specs estimated" : "Decoded via NHTSA vPIC"}
          </div>
          <h2 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">{vehicleTitle(vehicle)}</h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{vehicle.vin}</p>
        </div>
        <div className="flex gap-2">
          {onSave && (
            <Button variant="outline" className="gap-2 bg-card" onClick={onSave} disabled={isSaving}>
              {isSaved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
              {isSaved ? "Saved" : "Save to Garage"}
            </Button>
          )}
          {onAskAdvisor && (
            <Button className="gap-2" onClick={onAskAdvisor}>
              <MessageSquare className="size-4" /> Ask the Advisor
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Specs */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-base font-medium">Vehicle Specifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border/50">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between px-6 py-3">
                  <dt className="text-sm text-muted-foreground">{r.label}</dt>
                  <dd className="max-w-[60%] text-right text-sm font-medium">{r.value}</dd>
                </div>
              ))}
              {mileage != null && (
                <div className="flex items-center justify-between px-6 py-3">
                  <dt className="text-sm text-muted-foreground">Mileage</dt>
                  <dd className="text-right text-sm font-medium">{mileage.toLocaleString()} mi</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Score */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-base font-medium">GOGETTER Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex justify-center">
                <ScoreGauge score={score.overall} grade={score.grade} />
              </div>
              <div className="space-y-4">
                <SubscoreBar label="Reliability" value={score.reliability} />
                <SubscoreBar label="Safety" value={score.safety} />
                <SubscoreBar label="Age & Mileage" value={score.ageMileage} />
                <SubscoreBar label="Efficiency" value={score.efficiency} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Insights + Safety */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60">
            <Lightbulb className="size-4 text-primary" />
            <CardTitle className="text-base font-medium">Why this score</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <ul className="space-y-2.5">
              {score.notes.map((n, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60">
            <ShieldCheck className="size-4 text-primary" />
            <CardTitle className="text-base font-medium">Safety Features</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {vehicle.safetyFeatures.length ? (
              <div className="flex flex-wrap gap-2">
                {vehicle.safetyFeatures.map((f) => (
                  <Badge key={f.label} variant="secondary" className="font-normal">
                    {f.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No safety equipment was decoded for this VIN. Note that missing data does not always mean a feature is
                absent.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Premium teaser */}
      <PremiumTeaser vehicle={vehicle} />
    </div>
  );
}
