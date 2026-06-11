import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Compass, Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 40%, oklch(0.82 0.09 85 / 0.08), transparent 70%)",
        }}
      />
      <div className="glass relative mx-4 w-full max-w-lg rounded-2xl border border-border/60 p-10 text-center shadow-2xl motion-safe:fade-rise">
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="text-gold-gradient mt-6 font-serif text-7xl font-semibold leading-none">404</h1>
        <h2 className="mt-3 font-serif text-xl font-semibold">This road doesn't exist.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you're looking for may have been moved, renamed, or never built. Let's get you back
          on the lot.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button className="w-full gap-2 sm:w-auto">
              <Compass className="size-4" /> Go home
            </Button>
          </Link>
          <Link href="/lookup">
            <Button variant="outline" className="w-full gap-2 bg-transparent sm:w-auto">
              <Search className="size-4" /> Score a VIN
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
