/**
 * Seeded option/package catalog for the new-car trim configurator. Each option
 * carries a price delta plus optional effects on combined MPG and the GOGETTER
 * quality score. Safety packages feed the scoring engine's safety subscore by
 * contributing decoded safety features. Deterministic by design — swapping in a
 * real manufacturer build API would replace this catalog with live option data.
 */

export type ConfigOption = {
  id: string;
  group: string;
  label: string;
  /** USD added to both price and MSRP. */
  priceDelta: number;
  /** Change to combined MPG/MPGe (can be negative). */
  mpgDelta?: number;
  /** Direct nudge to the quality score for non-safety effects (tech/efficiency). */
  scoreDelta?: number;
  /** Safety features added to the build — raise the safety subscore. */
  addedSafetyFeatures?: string[];
  description?: string;
};

export const CONFIG_OPTIONS: ConfigOption[] = [
  {
    id: "driver-assist",
    group: "Safety",
    label: "Advanced Driver Assistance",
    priceDelta: 1800,
    addedSafetyFeatures: [
      "Adaptive Cruise Control",
      "Lane Keeping Assist",
      "Blind Spot Monitor",
      "Automatic Emergency Braking",
    ],
    description: "Full ADAS suite — adaptive cruise, lane centering, blind-spot & AEB.",
  },
  {
    id: "tech",
    group: "Technology",
    label: "Technology Package",
    priceDelta: 2400,
    scoreDelta: 1,
    addedSafetyFeatures: ["360° Camera", "Head-Up Display"],
    description: "12.3\" displays, wireless CarPlay/Android Auto, premium audio.",
  },
  {
    id: "premium",
    group: "Comfort",
    label: "Premium Comfort Package",
    priceDelta: 2900,
    scoreDelta: 1,
    description: "Leather, heated & ventilated seats, ambient lighting.",
  },
  {
    id: "awd",
    group: "Capability",
    label: "All-Wheel Drive",
    priceDelta: 2000,
    mpgDelta: -2,
    scoreDelta: 1,
    description: "All-weather traction and confident foul-weather grip.",
  },
  {
    id: "tow",
    group: "Capability",
    label: "Tow Package",
    priceDelta: 1100,
    mpgDelta: -1,
    description: "Hitch receiver, upgraded cooling, trailer-brake controller.",
  },
  {
    id: "efficiency",
    group: "Efficiency",
    label: "Eco / Efficiency Package",
    priceDelta: 900,
    mpgDelta: 3,
    scoreDelta: 1,
    description: "Low-rolling-resistance tires, active grille shutters, stop-start.",
  },
  {
    id: "roof",
    group: "Style",
    label: "Panoramic Moonroof",
    priceDelta: 1500,
    description: "Full-length glass roof with power sunshade.",
  },
  {
    id: "wheels",
    group: "Style",
    label: "Upgraded Alloy Wheels",
    priceDelta: 1300,
    mpgDelta: -1,
    description: "20\" machined alloy wheels.",
  },
  {
    id: "paint",
    group: "Style",
    label: "Premium Paint",
    priceDelta: 595,
    description: "Metallic or matte premium exterior color.",
  },
];

export function getConfigOption(id: string): ConfigOption | undefined {
  return CONFIG_OPTIONS.find((o) => o.id === id);
}
