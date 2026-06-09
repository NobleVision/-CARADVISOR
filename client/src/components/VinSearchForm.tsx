import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

type Props = {
  onSubmit: (vin: string, mileage?: number) => void;
  isLoading?: boolean;
  initialVin?: string;
  compact?: boolean;
};

const SAMPLE_VINS = [
  { vin: "1HGCM82633A004352", label: "2003 Honda Accord" },
  { vin: "5YJ3E1EA7HF000316", label: "2017 Tesla Model 3" },
  { vin: "1FTFW1ET5DFC10312", label: "2013 Ford F-150" },
];

export function VinSearchForm({ onSubmit, isLoading, initialVin = "", compact }: Props) {
  const [vin, setVin] = useState(initialVin);
  const [mileage, setMileage] = useState("");
  const [error, setError] = useState("");

  const cleanVin = vin.trim().toUpperCase();
  const vinValid = /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vinValid) {
      setError("Enter a valid 17-character VIN (letters and numbers, no I, O, or Q).");
      return;
    }
    setError("");
    const m = parseInt(mileage.replace(/[^0-9]/g, ""), 10);
    onSubmit(cleanVin, Number.isFinite(m) && m > 0 ? m : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-end" : "grid gap-4 sm:grid-cols-[1fr_180px]"}>
        <div className="space-y-1.5">
          <Label htmlFor="vin" className="text-xs uppercase tracking-wider text-muted-foreground">
            Vehicle Identification Number
          </Label>
          <Input
            id="vin"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="e.g. 1HGCM82633A004352"
            maxLength={17}
            autoComplete="off"
            spellCheck={false}
            className="h-11 font-mono tracking-wider"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mileage" className="text-xs uppercase tracking-wider text-muted-foreground">
            Mileage <span className="lowercase tracking-normal opacity-60">(optional)</span>
          </Label>
          <Input
            id="mileage"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="e.g. 72,000"
            inputMode="numeric"
            className="h-11"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isLoading} className="h-11 gap-2 px-6">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {isLoading ? "Decoding…" : "Decode & Score"}
        </Button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Try:</span>
          {SAMPLE_VINS.map((s) => (
            <button
              key={s.vin}
              type="button"
              onClick={() => {
                setVin(s.vin);
                setError("");
              }}
              className="rounded-full border border-border/70 px-2.5 py-1 transition-colors hover:border-primary/60 hover:text-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
