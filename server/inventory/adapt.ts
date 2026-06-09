import type { DecodedVehicle } from "../../drizzle/schema";
import type { BodyStyle, FuelKind, Listing } from "./types";

/**
 * Map a seeded inventory listing into the same `DecodedVehicle` shape the live
 * NHTSA decoder produces, so the existing scoring engine (`scoreVehicle`) and
 * the `VehicleResult` UI can render a listing-backed report without calling the
 * NHTSA API (the seeded VINs are synthetic and won't resolve against vPIC).
 *
 * When a real listings provider is plugged in, real VINs will decode through
 * NHTSA directly and this adapter simply won't be needed for those rows.
 */

const BODY_CLASS: Record<BodyStyle, string> = {
  Sedan: "Sedan/Saloon",
  SUV: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
  Truck: "Pickup",
  Coupe: "Coupe",
  Hatchback: "Hatchback/Liftback/Notchback",
  Minivan: "Minivan",
  Convertible: "Convertible/Cabriolet",
  Wagon: "Wagon",
};

const VEHICLE_TYPE: Record<BodyStyle, string> = {
  Sedan: "PASSENGER CAR",
  Coupe: "PASSENGER CAR",
  Hatchback: "PASSENGER CAR",
  Convertible: "PASSENGER CAR",
  Wagon: "PASSENGER CAR",
  SUV: "MULTIPURPOSE PASSENGER VEHICLE (MPV)",
  Minivan: "MULTIPURPOSE PASSENGER VEHICLE (MPV)",
  Truck: "TRUCK",
};

function fuelTypePrimary(fuel: FuelKind): string {
  switch (fuel) {
    case "EV":
      return "Electric";
    case "Hybrid":
      return "Gasoline/Electric Hybrid";
    case "Diesel":
      return "Diesel";
    default:
      return "Gasoline";
  }
}

function electrification(fuel: FuelKind): string {
  switch (fuel) {
    case "EV":
      return "BEV (Battery Electric Vehicle)";
    case "Hybrid":
      return "HEV (Hybrid Electric Vehicle)";
    default:
      return "Not Applicable";
  }
}

/**
 * A representative modern safety suite. Newer model years get the fuller set;
 * this mirrors the kind of equipment NHTSA would report and feeds the
 * safety subscore so listing-backed reports score consistently.
 */
function safetyFeaturesForYear(year: number): { label: string; value: string }[] {
  const base = [
    "Anti-lock Braking (ABS)",
    "Electronic Stability Control",
    "Traction Control",
    "Front Airbags",
    "Side Airbags",
    "Curtain Airbags",
    "Daytime Running Lights",
  ];
  const modern = [
    "Backup Camera",
    "Forward Collision Warning",
    "Automatic Emergency Braking",
    "Lane Departure Warning",
    "Blind Spot Monitoring",
  ];
  const advanced = ["Adaptive Cruise Control", "Lane Keep Assist", "Pedestrian AEB"];

  const labels = [...base];
  if (year >= 2017) labels.push(...modern);
  if (year >= 2020) labels.push(...advanced);
  return labels.map((label) => ({ label, value: "Standard" }));
}

function drivetrainCylinders(fuel: FuelKind): string {
  return fuel === "EV" ? "" : "4";
}

export function listingToDecodedVehicle(l: Listing): DecodedVehicle {
  return {
    vin: l.vin,
    make: l.make,
    model: l.model,
    modelYear: String(l.year),
    trim: l.trim,
    vehicleType: VEHICLE_TYPE[l.bodyStyle],
    bodyClass: BODY_CLASS[l.bodyStyle],
    driveType: "",
    fuelType: fuelTypePrimary(l.fuel),
    engineCylinders: drivetrainCylinders(l.fuel),
    engineHP: "",
    engineDisplacementL: "",
    transmissionStyle: l.fuel === "EV" ? "Automatic (single-speed)" : "Automatic",
    transmissionSpeeds: "",
    doors: l.bodyStyle === "Coupe" || l.bodyStyle === "Convertible" ? "2" : "4",
    manufacturer: l.make,
    plantCountry: "",
    plantCity: "",
    plantState: "",
    electrificationLevel: electrification(l.fuel),
    gvwr: "",
    safetyFeatures: safetyFeaturesForYear(l.year),
    raw: {
      __source: "gogetter-inventory",
      listingId: l.id,
      dealerName: l.dealerName,
      city: l.city,
      state: l.state,
      mpg: String(l.mpg),
      price: String(l.price),
      mileage: String(l.mileage),
      regionFlags: (l.regionFlags ?? []).join(" | "),
    },
  };
}
