import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SlidersHorizontal, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Trim = {
  id: string;
  vin: string;
  trim: string;
  price: number;
  msrp?: number | null;
};

type TrimConfiguratorProps = {
  make: string;
  model: string;
  trims: Trim[];
};

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-xs ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
      <span
        className={`tabular-nums ${
          strong ? "text-base font-semibold" : muted ? "text-xs text-muted-foreground" : "text-sm"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function TrimConfigurator({ make, model, trims }: TrimConfiguratorProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [trimId, setTrimId] = useState(trims[0]?.id ?? "");
  const [optionIds, setOptionIds] = useState<string[]>([]);

  const catalog = trpc.find.configOptions.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const config = trpc.find.configure.useQuery(
    { listingId: trimId, optionIds },
    {
      enabled: open && !!trimId,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
    },
  );
  const save = trpc.find.saveMatch.useMutation({
    onSuccess: () => toast.success("Saved build to your Garage"),
    onError: (e) => toast.error(e.message || "Could not save"),
  });

  const options = catalog.data ?? [];
  const groups = useMemo(() => {
    const map = new Map<string, typeof options>();
    for (const o of options) {
      const arr = map.get(o.group) ?? [];
      arr.push(o);
      map.set(o.group, arr);
    }
    return Array.from(map.entries());
  }, [options]);

  const toggle = (id: string) =>
    setOptionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedTrim = trims.find((t) => t.id === trimId) ?? trims[0];

  const onSave = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save builds to your Garage.");
      return;
    }
    if (trimId) save.mutate({ listingId: trimId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full gap-1.5 bg-transparent">
          <SlidersHorizontal className="size-3.5" /> Configure &amp; price
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Build your {make} {model}
          </DialogTitle>
          <DialogDescription>
            Pick a trim and options — price, MSRP, efficiency, and the GOGETTER score update live.
          </DialogDescription>
        </DialogHeader>

        {/* Trim selector */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Trim</Label>
          <div className="flex flex-wrap gap-2">
            {trims.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrimId(t.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  trimId === t.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span className="block font-medium">{t.trim}</span>
                <span className="block text-[11px] opacity-80">{usd(t.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
          {/* Options */}
          <div className="space-y-4">
            {groups.map(([group, opts]) => (
              <div key={group}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h4>
                <div className="space-y-1.5">
                  {opts.map((o) => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 p-2.5 hover:border-primary/40"
                    >
                      <Checkbox
                        checked={optionIds.includes(o.id)}
                        onCheckedChange={() => toggle(o.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{o.label}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            +{usd(o.priceDelta)}
                          </span>
                        </div>
                        {o.description && (
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            {o.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Live summary */}
          <div className="space-y-3">
            <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/50 p-3">
              {config.data ? (
                <ScoreGauge
                  score={config.data.qualityScore}
                  grade={config.data.qualityGrade}
                  size={120}
                  strokeWidth={8}
                />
              ) : (
                <div className="flex h-[120px] items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-3">
              <Row label="Base trim" value={usd(selectedTrim?.price ?? 0)} muted />
              <Row
                label="Options"
                value={config.data ? `+${usd(config.data.optionsTotal)}` : "—"}
                muted
              />
              <div className="my-1.5 h-px bg-border/60" />
              <Row label="Price" value={config.data ? usd(config.data.price) : "—"} strong />
              <Row label="MSRP" value={config.data ? usd(config.data.msrp) : "—"} muted />
              <Row
                label={config.data?.fuel === "EV" ? "MPGe" : "MPG"}
                value={config.data ? String(config.data.mpg) : "—"}
                muted
              />
            </div>
            <Button className="w-full gap-1.5" onClick={onSave} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Heart className="size-4" />
              )}
              Save build to Garage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
