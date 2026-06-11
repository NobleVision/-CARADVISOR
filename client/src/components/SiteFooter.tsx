import { Link } from "wouter";
import { Logo } from "./Logo";

const PRODUCT_LINKS = [
  { href: "/lookup", label: "VIN Lookup" },
  { href: "/find", label: "Find My Car" },
  { href: "/new-cars", label: "New Cars" },
  { href: "/compare", label: "Compare" },
];

const ACCOUNT_LINKS = [
  { href: "/saved", label: "My Garage" },
  { href: "/history", label: "History" },
  { href: "/premium", label: "Premium" },
  { href: "/login", label: "Sign in" },
];

type SiteFooterProps = {
  /** Single-row variant for utility pages. */
  compact?: boolean;
};

export function SiteFooter({ compact = false }: SiteFooterProps) {
  if (compact) {
    return (
      <footer className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-center sm:flex-row sm:text-left">
          <Link href="/" aria-label="GOGETTER home">
            <Logo size={26} withWordmark />
          </Link>
          <p className="text-[11px] text-muted-foreground">
            Vehicle data via the free NHTSA vPIC database · Scores are advisory heuristics, not guarantees.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container py-12">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="GOGETTER home">
              <Logo size={40} withWordmark />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The buyer-first co-pilot for car shopping: decode any VIN, read an honest 0–100 score,
              dodge the known traps, and walk in with a checklist — not hope.
            </p>
          </div>
          <nav aria-label="Product">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Product</h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Account">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Account</h3>
            <ul className="mt-4 space-y-2.5">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="hairline mt-10 h-px w-full" />
        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} NobleVision · GOGETTER Car Advisor</span>
          <span>
            Vehicle data via the free NHTSA vPIC database · Scores are advisory heuristics, not guarantees of
            condition.
          </span>
        </div>
      </div>
    </footer>
  );
}
