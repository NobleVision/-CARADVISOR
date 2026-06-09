import { scoreRingColor, gradeLabel } from "@/lib/vehicle";
import { cn } from "@/lib/utils";

type Props = {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function ScoreGauge({ score, grade, size = 168, strokeWidth = 10, className }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.3 0.009 265 / 60%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-4xl font-semibold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">/ 100</span>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="font-serif text-lg font-semibold" style={{ color }}>
            {grade}
          </span>
          <span className="text-xs text-muted-foreground">{gradeLabel(grade)}</span>
        </div>
      </div>
    </div>
  );
}

type BarProps = { label: string; value: number };

export function SubscoreBar({ label, value }: BarProps) {
  const color = scoreRingColor(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            transition: "width 0.9s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>
    </div>
  );
}
