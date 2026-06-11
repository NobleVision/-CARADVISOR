import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  /** Small uppercase kicker above the title (e.g. "Find My Car"). */
  eyebrow: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action slot (buttons preserved from the old headers). */
  actions?: ReactNode;
  /** "emerald" keeps the New Cars page's green identity. */
  tone?: "default" | "emerald";
  align?: "left" | "center";
  className?: string;
};

/**
 * The shared page header band: eyebrow + Fraunces serif headline + hairline,
 * over a faint grain texture — the app-wide echo of the landing page's
 * midnight-showroom language.
 */
export function PageHero({
  eyebrow,
  icon,
  title,
  description,
  actions,
  tone = "default",
  align = "left",
  className = "",
}: PageHeroProps) {
  const accent = tone === "emerald" ? "text-emerald-400" : "text-primary";
  const wash =
    tone === "emerald"
      ? "from-emerald-500/[0.07] to-transparent"
      : "from-primary/5 to-transparent";

  return (
    <section className={cn("relative border-b border-border/60 bg-gradient-to-b", wash, className)}>
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className={cn(
          "container relative flex flex-col gap-4 py-10 sm:flex-row sm:items-end sm:justify-between",
          align === "center" && "sm:flex-col sm:items-center sm:text-center",
        )}
      >
        <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
          <div
            className={cn(
              "flex items-center gap-2 motion-safe:fade-rise",
              accent,
              align === "center" && "justify-center",
            )}
          >
            {icon}
            <span className="text-xs font-medium uppercase tracking-[0.2em]">{eyebrow}</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight motion-safe:fade-rise sm:text-4xl [animation-delay:90ms]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-muted-foreground motion-safe:fade-rise [animation-delay:180ms]">
              {description}
            </p>
          )}
          <div className="hairline mt-6 h-px w-2/3 motion-safe:fade-rise [animation-delay:240ms]" />
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 motion-safe:fade-rise [animation-delay:180ms]">{actions}</div>}
      </div>
    </section>
  );
}
