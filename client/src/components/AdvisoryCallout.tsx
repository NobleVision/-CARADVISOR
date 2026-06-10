import type { RiskLevel, TrustSignal, VehicleAdvisory } from "@/lib/inventory";
import { AlertOctagon, AlertTriangle, BadgeCheck, Gem } from "lucide-react";

type AdvisoryCalloutProps = {
  advisories?: VehicleAdvisory[];
  riskLevel?: RiskLevel;
  trust?: TrustSignal;
  className?: string;
};

/**
 * Severity-styled knowledge callouts from the GOGETTER Reliability Index.
 *
 * - HIGH risk → the "don't walk away — RUN" banner (bold, but reduced-motion
 *   safe: only the icon pulses, and only when the user allows motion).
 * - Caution → amber verify-first callout.
 * - Value pick → emerald "curated pick" callout.
 * Waived advisories (manual transmission) render as good news.
 */
export function AdvisoryCallout({ advisories, riskLevel, trust, className = "" }: AdvisoryCalloutProps) {
  if (!advisories || advisories.length === 0) return null;

  const avoids = advisories.filter((a) => a.severity === "avoid" && !a.waivedByManual);
  const cautions = advisories.filter((a) => a.severity === "caution" && !a.waivedByManual);
  const picks = advisories.filter((a) => a.severity === "value-pick");
  const waived = advisories.filter((a) => a.waivedByManual);
  const source = advisories[0].source;

  return (
    <div className={`space-y-2 ${className}`}>
      {riskLevel === "high" && avoids.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border-2 border-destructive/60 bg-destructive/10 p-3.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
            <AlertOctagon className="size-4 shrink-0 motion-safe:animate-pulse" />
            Don't walk away — RUN.
          </div>
          {avoids.map((a) => (
            <div key={a.id} className="mt-2">
              <p className="text-xs font-medium text-rose-200">{a.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-foreground/80">{a.detail}</p>
              {a.transmissionNote && (
                <p className="mt-1 text-[11px] italic leading-snug text-amber-300">{a.transmissionNote}</p>
              )}
            </div>
          ))}
          {trust?.suspiciousDeal && (
            <p className="mt-2 rounded-md bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-rose-300">
              Suspiciously good deal on a known-defect model — the seller may know what's coming.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">{source}</p>
        </div>
      )}

      {cautions.length > 0 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            Verify before buying
          </div>
          {cautions.map((a) => (
            <div key={a.id} className="mt-1.5">
              <p className="text-xs font-medium text-amber-200">{a.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-foreground/80">{a.detail}</p>
            </div>
          ))}
          <p className="mt-2 text-[10px] text-muted-foreground">{source}</p>
        </div>
      )}

      {picks.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <Gem className="size-4 shrink-0" />
            GOGETTER value pick
          </div>
          {picks.map((a) => (
            <div key={a.id} className="mt-1.5">
              <p className="text-xs font-medium text-emerald-200">{a.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-foreground/80">{a.detail}</p>
            </div>
          ))}
          <p className="mt-2 text-[10px] text-muted-foreground">{source}</p>
        </div>
      )}

      {waived.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
            <BadgeCheck className="size-4 shrink-0" />
            Good news: {waived[0].title} only affects automatics — this manual avoids it.
          </div>
        </div>
      )}
    </div>
  );
}
