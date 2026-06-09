import { trpc } from "@/lib/trpc";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { TrendingDown } from "lucide-react";

type PriceTrendProps = {
  listingId?: string | null;
  priceAtSave?: number | null;
  lastKnownPrice?: number | null;
};

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Price-drop indicator for a saved vehicle: current vs. saved price, the drop
 * delta, and a tiny sparkline of recorded price history.
 */
export function PriceTrend({ listingId, priceAtSave, lastKnownPrice }: PriceTrendProps) {
  const history = trpc.find.priceHistory.useQuery(
    { listingId: listingId ?? "" },
    { enabled: !!listingId, refetchOnWindowFocus: false },
  );

  if (priceAtSave == null) return null;

  const current = lastKnownPrice ?? priceAtSave;
  const dropped = current < priceAtSave;
  const delta = priceAtSave - current;
  const pct = priceAtSave > 0 ? Math.round((delta / priceAtSave) * 100) : 0;
  const points = (history.data ?? []).map((p, i) => ({ i, price: p.price }));

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-foreground">{usd(current)}</span>
            {dropped && (
              <span className="text-xs text-muted-foreground line-through">{usd(priceAtSave)}</span>
            )}
          </div>
          {dropped ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <TrendingDown className="size-3" /> Down {usd(delta)} ({pct}%) since saved
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Tracking price · {usd(priceAtSave)} when saved
            </span>
          )}
        </div>
        {points.length >= 2 && (
          <div className="h-9 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={dropped ? "#34d399" : "#9ca3af"}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
