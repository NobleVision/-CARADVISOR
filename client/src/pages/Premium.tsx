import { NavBar } from "@/components/NavBar";
import { PremiumTeaser } from "@/components/PremiumTeaser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Layers, Lock, Sparkles } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    desc: "Everything you need to decode and evaluate.",
    features: [
      "Unlimited NHTSA VIN decoding",
      "GOGETTER quality score & breakdown",
      "AI conversational advisor",
      "Side-by-side comparison",
      "Search history & saved garage",
    ],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Premium",
    price: "Coming soon",
    desc: "Private vehicle-history intelligence layered on public data.",
    features: [
      "Everything in Free",
      "Accident & damage history (Carfax)",
      "Verified ownership count (Carfax)",
      "Live market value (CarGurus)",
      "Title & salvage checks",
      "AI advice enriched with history data",
    ],
    cta: "Join the waitlist",
    highlight: true,
  },
];

export default function Premium() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="size-3.5" /> GOGETTER Premium
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Go beyond the spec sheet
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Our free tier decodes what a vehicle <em>is</em>. Premium reveals what it has{" "}
            <em>been through</em> — by layering private history data from{" "}
            <span className="font-medium text-foreground">Carfax</span> and{" "}
            <span className="font-medium text-foreground">CarGurus</span> on top of public VIN intelligence.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={tier.highlight ? "relative border-primary/50 ring-1 ring-primary/20" : ""}
            >
              <CardContent className="p-7">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-semibold">{tier.name}</h2>
                  {tier.highlight && <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Roadmap</Badge>}
                </div>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{tier.price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      {tier.highlight && f.includes("(") ? (
                        <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      )}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="size-4 text-primary" /> A preview of premium data on any decoded vehicle
          </div>
          <PremiumTeaser variant="full" />
        </div>
      </div>
    </div>
  );
}
