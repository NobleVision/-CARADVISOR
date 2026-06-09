import type { DecodedVehicle, ScoreBreakdown } from "../../../drizzle/schema";

export type { DecodedVehicle, ScoreBreakdown };

export type DecodeResult = {
  vehicle: DecodedVehicle;
  score: ScoreBreakdown;
  mileage: number | null;
};

/** Tailwind text color class for a given 0-100 score. */
export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-primary";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

export function scoreRingColor(score: number): string {
  if (score >= 85) return "oklch(0.78 0.13 155)";
  if (score >= 70) return "oklch(0.82 0.09 85)";
  if (score >= 55) return "oklch(0.8 0.13 70)";
  return "oklch(0.68 0.18 20)";
}

export function gradeLabel(grade: string): string {
  if (grade.startsWith("A")) return "Excellent";
  if (grade.startsWith("B")) return "Good";
  if (grade.startsWith("C")) return "Fair";
  if (grade.startsWith("D")) return "Below Average";
  return "Poor";
}

export function vehicleTitle(v: DecodedVehicle): string {
  return [v.modelYear, v.make, v.model].filter(Boolean).join(" ") || v.vin;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function specRows(v: DecodedVehicle): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "Make", value: titleCase(v.make) },
    { label: "Model", value: titleCase(v.model) },
    { label: "Model Year", value: v.modelYear },
    { label: "Trim", value: v.trim },
    { label: "Body Class", value: v.bodyClass },
    { label: "Vehicle Type", value: titleCase(v.vehicleType) },
    { label: "Drive Type", value: v.driveType },
    {
      label: "Engine",
      value: [
        v.engineCylinders ? `${v.engineCylinders}-cyl` : "",
        v.engineDisplacementL ? `${parseFloat(v.engineDisplacementL).toFixed(1)}L` : "",
        v.engineHP ? `${v.engineHP} hp` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      label: "Transmission",
      value: [v.transmissionStyle, v.transmissionSpeeds ? `${v.transmissionSpeeds}-speed` : ""]
        .filter(Boolean)
        .join(" · "),
    },
    { label: "Fuel Type", value: v.fuelType },
    { label: "Electrification", value: v.electrificationLevel },
    { label: "Doors", value: v.doors },
    { label: "Manufacturer", value: titleCase(v.manufacturer) },
    {
      label: "Assembly Plant",
      value: [titleCase(v.plantCity), v.plantState ? titleCase(v.plantState) : "", v.plantCountry ? titleCase(v.plantCountry) : ""]
        .filter(Boolean)
        .join(", "),
    },
  ];
  return rows.filter((r) => r.value && r.value.trim());
}
