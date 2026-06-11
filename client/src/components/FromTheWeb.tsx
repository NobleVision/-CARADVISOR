import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Globe } from "lucide-react";

/**
 * "From the web" — real owner-reported problem / reliability links for this
 * model-year, via Brave Search (metered; cached 6h server-side). Hidden when
 * the websearch service is off or nothing useful came back.
 */
export function FromTheWeb({
  make,
  model,
  modelYear,
}: {
  make: string;
  model: string;
  modelYear: string;
}) {
  const config = trpc.config.public.useQuery(undefined, { staleTime: Infinity });
  const enabled = Boolean(config.data?.services.websearch && make && model && modelYear);
  const intel = trpc.vehicle.webIntel.useQuery(
    { make, model, modelYear },
    { enabled, retry: false, staleTime: Infinity },
  );

  const results = intel.data?.available ? intel.data.results : [];
  if (!enabled || results.length === 0) return null;

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <Globe className="size-5 text-primary" /> From the web
        </CardTitle>
        <CardDescription>
          What real owners and reviewers report about the {modelYear} {make} {model} — read
          alongside the decoded data, not instead of it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {results.slice(0, 5).map((r) => (
            <li key={r.url} className="group">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border/50 bg-secondary/20 p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug group-hover:text-primary">
                    {r.title}
                  </span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </div>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  {r.siteName && (
                    <Badge variant="outline" className="bg-transparent text-[10px] font-normal">
                      {r.siteName}
                    </Badge>
                  )}
                  {r.age && <span className="text-[10px] text-muted-foreground">{r.age}</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Results from Brave Search · unverified web content — corroborate before relying on it.
        </p>
      </CardContent>
    </Card>
  );
}
