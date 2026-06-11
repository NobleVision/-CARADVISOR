import { NavBar } from "@/components/NavBar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ScoreGauge, SubscoreBar } from "@/components/ScoreGauge";
import { trpc } from "@/lib/trpc";
import { scoreColor, specRows, vehicleTitle, type DecodeResult } from "@/lib/vehicle";
import { GitCompareArrows, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Slot = { id: number; vin: string; mileage: string; result: DecodeResult | null; loading: boolean };

let nextId = 3;

export default function Compare() {
  const [slots, setSlots] = useState<Slot[]>([
    { id: 1, vin: "", mileage: "", result: null, loading: false },
    { id: 2, vin: "", mileage: "", result: null, loading: false },
  ]);

  const utils = trpc.useUtils();
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const prefilled = useRef(false);

  const setSlot = (id: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  /**
   * Decode a VIN for a slot. Tries inventory-backed report first (seeded match
   * VINs are synthetic and won't resolve against NHTSA), then falls back to a
   * live NHTSA decode for real, user-entered VINs.
   */
  const decodeVinForSlot = async (id: number, vinRaw: string, mileageRaw: string) => {
    const vin = vinRaw.trim().toUpperCase();
    const isRealVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
    const m = parseInt((mileageRaw || "").replace(/[^0-9]/g, ""), 10);
    const mileage = Number.isFinite(m) && m > 0 ? m : undefined;
    setSlot(id, { loading: true });
    try {
      // Inventory-backed report (works for seeded shortlist VINs)
      const inv = await utils.client.find.reportByVin.query({ vin });
      if (inv) {
        setSlot(id, {
          result: { source: "inventory", vehicle: inv.vehicle, score: inv.score } as unknown as DecodeResult,
          loading: false,
        });
        return;
      }
      if (!isRealVin) {
        setSlot(id, { loading: false });
        toast.error("Enter a valid 17-character VIN");
        return;
      }
      const data = await utils.client.vehicle.decode.mutate({ vin, mileage });
      setSlot(id, { result: data, loading: false });
    } catch (err) {
      setSlot(id, { loading: false });
      toast.error("Could not decode VIN", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const decodeSlot = async (id: number) => {
    const slot = slotsRef.current.find((s) => s.id === id);
    if (!slot) return;
    await decodeVinForSlot(id, slot.vin, slot.mileage);
  };

  // "Compare my matches" handoff: read ?vins=A,B,C from the URL once, prefill
  // slots, and auto-decode them.
  useEffect(() => {
    if (prefilled.current) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("vins");
    if (!raw) return;
    prefilled.current = true;
    const vins = raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 3);
    if (vins.length === 0) return;
    const newSlots: Slot[] = vins.map((vin, i) => ({
      id: i + 1,
      vin,
      mileage: "",
      result: null,
      loading: true,
    }));
    while (newSlots.length < 2) {
      newSlots.push({ id: newSlots.length + 1, vin: "", mileage: "", result: null, loading: false });
    }
    nextId = newSlots.length + 1;
    setSlots(newSlots);
    vins.forEach((vin, i) => {
      void decodeVinForSlot(i + 1, vin, "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSlot = () => {
    if (slots.length >= 3) return;
    setSlots((prev) => [...prev, { id: nextId++, vin: "", mileage: "", result: null, loading: false }]);
  };
  const removeSlot = (id: number) =>
    setSlots((prev) => (prev.length <= 2 ? prev : prev.filter((s) => s.id !== id)));

  const decoded = slots.filter((s) => s.result);
  const bestScore = Math.max(0, ...decoded.map((s) => s.result!.score.overall));

  // Union of spec labels across decoded vehicles for aligned rows
  const specLabels = Array.from(
    new Set(decoded.flatMap((s) => specRows(s.result!.vehicle).map((r) => r.label))),
  );

  return (
    <div className="min-h-screen">
      <NavBar />
      <div data-tour="compare">
        <PageHero
          eyebrow="Compare"
          icon={<GitCompareArrows className="size-4" />}
          title="Two VINs enter. The truth comes out."
          description="Decode up to three VINs and weigh their specs and scores side by side."
        />
      </div>
      <div className="container py-10">

        {/* Input row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot, idx) => (
            <Card key={slot.id} className="card-lift border-border/70">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Vehicle {idx + 1}</span>
                  {slots.length > 2 && (
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeSlot(slot.id)}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <Input
                  value={slot.vin}
                  onChange={(e) => setSlot(slot.id, { vin: e.target.value.toUpperCase() })}
                  placeholder="17-character VIN"
                  maxLength={17}
                  className="font-mono text-sm"
                />
                <Input
                  value={slot.mileage}
                  onChange={(e) => setSlot(slot.id, { mileage: e.target.value })}
                  placeholder="Mileage (optional)"
                  inputMode="numeric"
                />
                <Button className="w-full gap-2" onClick={() => decodeSlot(slot.id)} disabled={slot.loading}>
                  {slot.loading ? <Spinner className="size-4" /> : <Search className="size-4" />}
                  Decode
                </Button>
              </CardContent>
            </Card>
          ))}
          {slots.length < 3 && (
            <button
              onClick={addSlot}
              className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="mr-2 size-4" /> Add vehicle
            </button>
          )}
        </div>

        {/* Comparison */}
        {decoded.length >= 2 && (
          <div className="mt-12 space-y-8">
            {/* Scores */}
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${decoded.length}, minmax(0, 1fr))` }}>
              {decoded.map((s) => {
                const r = s.result!;
                const isBest = r.score.overall === bestScore;
                return (
                  <Card key={s.id} className={isBest ? "border-primary/50 ring-1 ring-primary/20" : ""}>
                    <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                      {isBest && (
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                          Top score
                        </span>
                      )}
                      <h3 className="font-serif text-lg font-semibold">{vehicleTitle(r.vehicle)}</h3>
                      <ScoreGauge score={r.score.overall} grade={r.score.grade} size={140} />
                      <div className="w-full space-y-3 pt-2 text-left">
                        <SubscoreBar label="Reliability" value={r.score.reliability} />
                        <SubscoreBar label="Safety" value={r.score.safety} />
                        <SubscoreBar label="Age & Mileage" value={r.score.ageMileage} />
                        <SubscoreBar label="Efficiency" value={r.score.efficiency} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Spec matrix */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Specification
                        </th>
                        {decoded.map((s) => (
                          <th key={s.id} className="px-5 py-3 text-left font-medium">
                            {vehicleTitle(s.result!.vehicle)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="px-5 py-3 text-muted-foreground">Overall Score</td>
                        {decoded.map((s) => (
                          <td key={s.id} className={`px-5 py-3 font-semibold ${scoreColor(s.result!.score.overall)}`}>
                            {s.result!.score.overall} ({s.result!.score.grade})
                          </td>
                        ))}
                      </tr>
                      {specLabels.map((label) => (
                        <tr key={label}>
                          <td className="px-5 py-3 text-muted-foreground">{label}</td>
                          {decoded.map((s) => {
                            const row = specRows(s.result!.vehicle).find((r) => r.label === label);
                            return (
                              <td key={s.id} className="px-5 py-3">
                                {row?.value ?? <span className="text-muted-foreground/50">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <SiteFooter compact />
    </div>
  );
}
