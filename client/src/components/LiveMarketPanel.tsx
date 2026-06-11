import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";

type LiveMarketInputs = {
  make?: string;
  maxPrice?: number;
  zip?: string;
  condition?: "New" | "Used" | "Any";
};

/**
 * "Live market scan" — one real web search (Brave) for listings matching the
 * buyer's criteria, badged by marketplace. The metered API is only hit after
 * the user explicitly clicks the scan button; results are cached server-side
 * for 6h. Remount with a new `key` when the criteria change so the explicit
 * opt-in resets. Hidden when the websearch service is off.
 */
export function LiveMarketPanel(inputs: LiveMarketInputs) {
  const config = trpc.config.public.useQuery(undefined, { staleTime: Infinity });
  const [requested, setRequested] = useState(false);
  const live = trpc.find.liveMarket.useQuery(inputs, {
    enabled: requested,
    retry: false,
    staleTime: Infinity,
  });

  if (!config.data?.services.websearch) return null;

  const results = live.data?.available ? live.data.results : [];

  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Globe className="size-4 text-primary" /> Live market scan
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Search the real web for matching cars near you — Cars.com, AutoTrader, CarGurus,
              Craigslist and more.
            </p>
          </div>
          {!requested && (
            <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={() => setRequested(true)}>
              <Globe className="size-3.5" /> Scan the live market
            </Button>
          )}
        </div>

        {requested && live.isLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Searching the web…
          </div>
        )}

        {requested && !live.isLoading && results.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No live results right now — try again in a bit.
          </p>
        )}

        {results.length > 0 && (
          <>
            <ul className="mt-4 space-y-2.5">
              {results.slice(0, 8).map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.marketplace ? (
                          <Badge className="bg-primary/15 text-[10px] text-primary hover:bg-primary/15">
                            {r.marketplace}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-transparent text-[10px] font-normal">
                            Web
                          </Badge>
                        )}
                        {r.age && <span className="text-[10px] text-muted-foreground">{r.age}</span>}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium group-hover:text-primary">
                        {r.title}
                      </p>
                      {r.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Results from Brave Search{live.data?.query ? ` · “${live.data.query}”` : ""} — external
              sites, unverified by GOGETTER.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
