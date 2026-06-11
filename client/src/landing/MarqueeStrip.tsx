const ITEMS = [
  "VIN DECODE",
  "0–100 SCORE",
  "KNOWN-DEFECT WARNINGS",
  "DON'T WALK — RUN",
  "AI ADVISOR",
  "PRICE-DROP ALERTS",
  "PRE-PURCHASE CHECKLIST",
  "NHTSA RECALLS",
];

function Row({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {item}
          </span>
          <span className="size-1 rounded-full bg-primary/60" />
        </span>
      ))}
    </div>
  );
}

/** Brand texture strip: a slow uppercase ticker of what the engine does. */
export function MarqueeStrip() {
  return (
    <div className="overflow-hidden border-y border-border/60 bg-card/30 py-3.5">
      <div className="marquee-track flex w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
