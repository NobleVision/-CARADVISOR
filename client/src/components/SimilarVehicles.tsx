import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/inventory";
import { trpc } from "@/lib/trpc";
import { ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

/**
 * "More like this" — semantic nearest neighbors from the Pinecone index when
 * configured, deterministic comparables otherwise. Hidden entirely for VINs
 * outside the seeded inventory (the query returns an empty list).
 */
export function SimilarVehicles({ vin }: { vin: string }) {
  const similar = trpc.find.similar.useQuery(
    { vin },
    { enabled: vin.length > 0, retry: false, staleTime: 10 * 60 * 1000 },
  );

  const items = similar.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-xl font-semibold">More like this</h3>
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 bg-primary/10 text-[10px] font-normal text-primary"
        >
          <Sparkles className="size-3" />
          {similar.data!.source === "vector" ? "AI similarity · Pinecone" : "Comparable picks"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((it) => (
          <Link
            key={it.id}
            href={`/vehicle/${it.vin}`}
            className="card-lift block overflow-hidden rounded-xl border border-border/60 bg-card/50"
          >
            {it.photo ? (
              <img src={it.photo} alt={it.label} loading="lazy" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 w-full bg-gradient-to-br from-secondary to-card" />
            )}
            <div className="space-y-1.5 p-3">
              <p className="truncate text-sm font-medium" title={it.label}>
                {it.label}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">{formatUSD(it.price)}</span>
                <span className="text-muted-foreground">
                  {it.condition === "New" ? "New" : `${Math.round(it.mileage / 1000)}k mi`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {it.qualityScore}/100 · {it.qualityGrade}
                </Badge>
                {it.riskLevel === "high" && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-red-500/40 bg-red-500/10 text-[10px] text-red-300"
                  >
                    <ShieldAlert className="size-3" /> Known issues
                  </Badge>
                )}
                {it.riskLevel === "caution" && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300"
                  >
                    <TriangleAlert className="size-3" /> Caution
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
