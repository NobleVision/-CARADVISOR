import type { DecodedVehicle } from "../drizzle/schema";

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

/** Basic structural VIN validation (17 chars, no I/O/Q). */
export function isValidVin(vin: string): boolean {
  const v = vin.trim().toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}

function pick(raw: Record<string, string>, key: string): string {
  const val = raw[key];
  if (!val) return "";
  if (val === "Not Applicable" || val === "0") return "";
  return val.trim();
}

const SAFETY_KEYS: { key: string; label: string }[] = [
  { key: "ABS", label: "Anti-lock Braking (ABS)" },
  { key: "ESC", label: "Electronic Stability Control" },
  { key: "TractionControl", label: "Traction Control" },
  { key: "ForwardCollisionWarning", label: "Forward Collision Warning" },
  { key: "AEB", label: "Automatic Emergency Braking" },
  { key: "CIB", label: "Crash Imminent Braking" },
  { key: "BlindSpotMon", label: "Blind Spot Monitoring" },
  { key: "LaneDepartureWarning", label: "Lane Departure Warning" },
  { key: "LaneKeepSystem", label: "Lane Keep Assist" },
  { key: "AdaptiveCruiseControl", label: "Adaptive Cruise Control" },
  { key: "RearVisibilitySystem", label: "Backup Camera" },
  { key: "ParkAssist", label: "Park Assist" },
  { key: "DaytimeRunningLight", label: "Daytime Running Lights" },
  { key: "PedestrianAutomaticEmergencyBraking", label: "Pedestrian AEB" },
  { key: "AirBagLocFront", label: "Front Airbags" },
  { key: "AirBagLocSide", label: "Side Airbags" },
  { key: "AirBagLocCurtain", label: "Curtain Airbags" },
  { key: "AirBagLocKnee", label: "Knee Airbags" },
];

/**
 * Decode a VIN using the free NHTSA vPIC API.
 * Returns a normalized DecodedVehicle or throws with a friendly message.
 */
export async function decodeVin(vinInput: string, modelYear?: string): Promise<DecodedVehicle> {
  const vin = vinInput.trim().toUpperCase();
  if (!isValidVin(vin)) {
    throw new Error("Invalid VIN. A VIN must be 17 characters and cannot contain I, O, or Q.");
  }

  const url = `${NHTSA_BASE}/DecodeVinValues/${encodeURIComponent(vin)}?format=json${
    modelYear ? `&modelyear=${encodeURIComponent(modelYear)}` : ""
  }`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new Error("Could not reach the NHTSA vehicle database. Please try again.");
  }

  if (!res.ok) {
    throw new Error(`NHTSA service returned an error (${res.status}). Please try again.`);
  }

  const data = (await res.json()) as { Results?: Record<string, string>[] };
  const raw = data.Results?.[0];
  if (!raw) {
    throw new Error("No data returned for that VIN.");
  }

  const make = pick(raw, "Make");
  const model = pick(raw, "Model");
  const year = pick(raw, "ModelYear");

  // If NHTSA couldn't decode the core identity, treat as not found.
  if (!make && !model && !year) {
    const errText = pick(raw, "ErrorText");
    throw new Error(
      errText && !errText.startsWith("0")
        ? "This VIN could not be decoded. Please double-check the characters."
        : "This VIN could not be decoded into a recognizable vehicle.",
    );
  }

  const safetyFeatures = SAFETY_KEYS.map(({ key, label }) => ({
    label,
    value: pick(raw, key),
  })).filter((f) => f.value);

  return {
    vin,
    make,
    model,
    modelYear: year,
    trim: pick(raw, "Trim") || pick(raw, "Series"),
    vehicleType: pick(raw, "VehicleType"),
    bodyClass: pick(raw, "BodyClass"),
    driveType: pick(raw, "DriveType"),
    fuelType: pick(raw, "FuelTypePrimary"),
    engineCylinders: pick(raw, "EngineCylinders"),
    engineHP: pick(raw, "EngineHP"),
    engineDisplacementL: pick(raw, "DisplacementL"),
    transmissionStyle: pick(raw, "TransmissionStyle"),
    transmissionSpeeds: pick(raw, "TransmissionSpeeds"),
    doors: pick(raw, "Doors"),
    manufacturer: pick(raw, "Manufacturer"),
    plantCountry: pick(raw, "PlantCountry"),
    plantCity: pick(raw, "PlantCity"),
    plantState: pick(raw, "PlantState"),
    electrificationLevel: pick(raw, "ElectrificationLevel"),
    gvwr: pick(raw, "GVWR"),
    safetyFeatures,
    raw,
  };
}
