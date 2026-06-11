type LogoProps = {
  /** Mark height/width in px. */
  size?: number;
  /** Render the GOGETTER / CAR ADVISOR wordmark beside the mark. */
  withWordmark?: boolean;
  className?: string;
};

/**
 * The GOGETTER Car Advisor brand mark (docs/images/caradvisor-logo-nowords.png,
 * resized into /brand — the wordless variant, since the GOGETTER / CAR ADVISOR
 * text renders separately below). The artwork sits on a near-black field, so a
 * rounded crop keeps it looking intentional on both the light and dark themes.
 */
export function Logo({ size = 36, withWordmark = false, className = "" }: LogoProps) {
  const mark = (
    <img
      src="/brand/caradvisor-logo-nowords.png"
      width={size}
      height={size}
      alt="GOGETTER Car Advisor"
      className="shrink-0 rounded-[22%] object-cover"
      draggable={false}
    />
  );

  if (!withWordmark) {
    return <span className={`inline-flex ${className}`}>{mark}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="flex flex-col leading-none">
        <span className="font-serif text-lg font-semibold tracking-wide text-foreground">GOGETTER</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-primary">Car Advisor</span>
      </span>
    </span>
  );
}
