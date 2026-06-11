import { StatCounter } from "./StatCounter";

const STATS = [
  { value: 16, suffix: "", label: "known-defect patterns indexed, model year by model year" },
  { value: 100, prefix: "0–", label: "point score with every input explained in plain English" },
  { value: 10, prefix: "~", suffix: "s", label: "from pasting a VIN to an honest verdict" },
];

/** The origin story: a real grandfather, a real trap, and the line that named a feature. */
export function StorySection() {
  return (
    <section className="container py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Why this exists
        </span>
        <blockquote className="mt-6">
          <p className="font-serif text-2xl font-medium leading-snug sm:text-4xl">
            "You should not be <em className="not-italic text-muted-foreground">walking</em> to go get
            that car. <span className="text-gold-gradient">You should be running.</span>"
          </p>
          <footer className="mt-5 text-sm text-muted-foreground">
            — the AI warning that saved a first car purchase, and named our favorite feature
          </footer>
        </blockquote>
        <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
          GOGETTER began as one grandfather's weekend of careful research to find his granddaughter a
          safe first car — the trap models, the value picks, the questions that make a dealer tell the
          truth. We turned that playbook into software, so every buyer gets the same edge.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-3xl gap-8 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <StatCounter
              value={s.value}
              prefix={s.prefix ?? ""}
              suffix={s.suffix ?? ""}
              className="text-gold-gradient font-serif text-5xl font-semibold tabular-nums"
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
