import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { useTour } from "@/tour/TourProvider";
import { FileSearch, ShieldCheck, WifiOff } from "lucide-react";

type Props = {
  make: string;
  model: string;
  modelYear: string | number;
};

/**
 * Free public-records enrichment: open recall campaigns from NHTSA's public
 * database, queried by make/model/year (works for demo listings and real VINs
 * alike). The first live slice of the "micro layer" — no key, no cost.
 * Hidden during the guided tour, which must make no live external calls.
 */
export function PublicRecords({ make, model, modelYear }: Props) {
  const { isTourActive } = useTour();
  const enabled =
    Boolean(make && model && /^\d{4}$/.test(String(modelYear))) && !isTourActive;
  const query = trpc.vehicle.recalls.useQuery(
    { make, model, modelYear: String(modelYear) },
    { enabled, retry: false, refetchOnWindowFocus: false },
  );

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60">
        <div className="flex items-center gap-2">
          <FileSearch className="size-4 text-primary" />
          <CardTitle className="text-base font-medium">Public records — NHTSA recalls</CardTitle>
        </div>
        {query.data && query.data.count > 0 && (
          <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">
            {query.data.count} recall{query.data.count === 1 ? "" : "s"}
          </Badge>
        )}
        {query.data && query.data.count === 0 && (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            None found
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-5">
        {query.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!query.isLoading && (query.isError || query.data === null) && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="size-4" /> Couldn't reach NHTSA's recall database right now — try again in a
            moment.
          </p>
        )}

        {query.data && query.data.count === 0 && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            No open recall campaigns found for this make/model/year in NHTSA's free public database. Still
            confirm any completed recall work with the seller's service records.
          </p>
        )}

        {query.data && query.data.count > 0 && (
          <>
            <Accordion type="single" collapsible>
              {query.data.recalls.map((r, i) => (
                <AccordionItem key={r.campaignNumber ?? i} value={`recall-${i}`}>
                  <AccordionTrigger className="py-2.5 text-left text-sm hover:no-underline">
                    <span className="pr-2 font-medium">{r.component || "Recall campaign"}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
                    {r.remedy && (
                      <p className="mt-2 text-sm leading-relaxed">
                        <span className="font-medium text-emerald-300">Remedy: </span>
                        <span className="text-muted-foreground">{r.remedy}</span>
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {r.campaignNumber && <span>Campaign {r.campaignNumber}</span>}
                      {r.reportDate && <span>Reported {r.reportDate}</span>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Recall repairs are performed free by franchised dealers. Ask the seller for proof the work was
              completed — or run the VIN at nhtsa.gov for campaign status.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
