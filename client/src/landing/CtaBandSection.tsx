import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";

export function CtaBandSection() {
  return (
    <section className="relative overflow-hidden border-y border-primary/20 bg-gradient-to-b from-primary/12 via-primary/5 to-transparent">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container relative py-20 text-center sm:py-24">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl font-semibold leading-tight motion-safe:fade-rise sm:text-5xl">
          Stop guessing. <span className="text-gold-gradient">Start scoring.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground motion-safe:fade-rise [animation-delay:100ms]">
          Decode your first VIN free — no account needed. Or jump straight into the demo showroom.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 motion-safe:fade-rise [animation-delay:180ms]">
          <Link href="/lookup">
            <Button size="lg" className="gap-2 px-8">
              <Search className="size-4" /> Score a VIN now
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2 bg-transparent px-8">
              <Sparkles className="size-4" /> Try the demo · admin / admin
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
