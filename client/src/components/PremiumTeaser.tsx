import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DecodedVehicle } from "@/lib/vehicle";
import { AlertTriangle, DollarSign, Lock, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

type Props = { vehicle?: DecodedVehicle; variant?: "inline" | "full" };

const LOCKED = [
  {
    icon: AlertTriangle,
    title: "Accident & Damage History",
    blurred: "2 reported incidents · Frame damage flagged",
    desc: "Full title, salvage, and reported collision records.",
  },
  {
    icon: Users,
    title: "Ownership Count",
    blurred: "3 previous owners · Last sold 14 mo ago",
    desc: "Number of owners, registration changes, and usage type.",
  },
  {
    icon: DollarSign,
    title: "Market Value Estimate",
    blurred: "$18,400 – $21,900 fair range",
    desc: "Live market pricing benchmarked against comparable listings.",
  },
];

export function PremiumTeaser({ vehicle, variant = "inline" }: Props) {
  return (
    <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-card to-primary/[0.04]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-serif text-xl font-semibold">Unlock the full picture with GOGETTER Premium</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Public VIN data tells you what a car <em>is</em>. Premium adds private vehicle-history intelligence —
              powered by partners like <span className="font-medium text-foreground">Carfax</span> and{" "}
              <span className="font-medium text-foreground">CarGurus</span> — so you know what it has{" "}
              <em>been through</em>.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/40 text-primary">
            Coming soon
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LOCKED.map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-xl border border-border/60 bg-background/40 p-4"
            >
              <div className="flex items-center gap-2">
                <item.icon className="size-4 text-primary" />
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <div className="relative mt-3">
                <p className="select-none text-sm font-medium blur-[5px]" aria-hidden>
                  {item.blurred}
                </p>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="size-4 text-muted-foreground" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              toast("GOGETTER Premium is on the way", {
                description:
                  "Carfax & CarGurus history integration is part of our premium roadmap. This panel is a preview.",
              })
            }
            className="gap-2"
          >
            <Sparkles className="size-4" /> Preview Premium
          </Button>
          <span className="text-xs text-muted-foreground">
            {vehicle ? `Reserved for ${vehicle.modelYear} ${vehicle.make} ${vehicle.model}` : "Data sources: Carfax · CarGurus"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
