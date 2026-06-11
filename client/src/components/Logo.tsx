import { useId } from "react";

type LogoProps = {
  /** Mark height/width in px. */
  size?: number;
  /** Render the GOGETTER / CAR ADVISOR wordmark beside the mark. */
  withWordmark?: boolean;
  className?: string;
};

/**
 * The GOGETTER G-Gauge monogram: a letter G whose mouth is a speedometer's
 * redline gap, with the crossbar doubling as the needle. Inline SVG so it
 * stays crisp at any size; gradient ids are namespaced per instance via
 * useId so multiple logos can render on one page (NavBar + footer + login).
 */
export function Logo({ size = 36, withWordmark = false, className = "" }: LogoProps) {
  const uid = useId();
  const goldId = `gg-gold-${uid}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="GOGETTER"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={goldId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6D488" />
          <stop offset="1" stopColor="#C9A24A" />
        </linearGradient>
      </defs>
      <path
        d="M 43 12.95 A 22 22 0 1 0 53.67 28.18"
        stroke={`url(#${goldId})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line x1="53.45" y1="28.25" x2="45.6" y2="29.6" stroke={`url(#${goldId})`} strokeWidth="5" strokeLinecap="round" />
      <g stroke="#E9C97A" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round">
        <line x1="16.50" y1="37.64" x2="13.68" y2="38.67" />
        <line x1="21.39" y1="44.64" x2="19.47" y2="46.94" />
        <line x1="29.14" y1="48.25" x2="28.61" y2="51.20" />
        <line x1="37.64" y1="47.51" x2="38.67" y2="50.32" />
        <line x1="44.64" y1="42.61" x2="46.94" y2="44.53" />
      </g>
      <line x1="40.25" y1="17.71" x2="41.75" y2="15.11" stroke="#E5484D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="47.56" y2="21.10" stroke={`url(#${goldId})`} strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill={`url(#${goldId})`} />
    </svg>
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
