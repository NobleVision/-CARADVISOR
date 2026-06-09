// Deterministic generator for a realistic seeded inventory (new + used cars).
// Run: node scripts/genInventory.mjs > server/inventory/data.json
// Produces ~90 varied listings: used cars (franchise/independent/private) and
// new cars (franchise only), with plausible VINs, prices, mileages, photos,
// warranties and model-reputation notes.

const CURRENT_YEAR = 2026;

// model catalog: [make, model, bodyStyle, fuel, baseMsrp, typicalMpg, trims, reputation]
const CATALOG = [
  ["Toyota", "Camry", "Sedan", "Gas", 28400, 32, ["LE", "SE", "XLE", "XSE"], "Perennial best-seller; IIHS Top Safety Pick, legendary resale value."],
  ["Toyota", "RAV4", "SUV", "Gas", 29000, 30, ["LE", "XLE", "Adventure", "Limited"], "Best-selling SUV in America; strong reliability and resale."],
  ["Toyota", "RAV4 Hybrid", "SUV", "Hybrid", 32000, 39, ["LE", "XLE", "Limited"], "Class-leading hybrid efficiency with Toyota dependability."],
  ["Toyota", "Corolla", "Sedan", "Gas", 23000, 35, ["L", "LE", "SE"], "Compact-class benchmark for reliability and low running costs."],
  ["Toyota", "Tacoma", "Truck", "Gas", 33000, 21, ["SR", "SR5", "TRD Sport"], "Dominates midsize-truck resale; redesigned for 2024."],
  ["Honda", "Civic", "Sedan", "Gas", 24000, 36, ["LX", "Sport", "EX", "Touring"], "Car & Driver 10Best regular; refined ride and strong safety."],
  ["Honda", "CR-V", "SUV", "Gas", 29000, 30, ["LX", "EX", "EX-L"], "Top pick for families; spacious and dependable."],
  ["Honda", "Accord", "Sedan", "Gas", 28000, 33, ["LX", "Sport", "EX-L"], "Midsize benchmark; refined, efficient, and reliable."],
  ["Honda", "Accord Hybrid", "Sedan", "Hybrid", 33000, 44, ["Sport", "EX-L", "Touring"], "Excellent hybrid economy with premium-feeling cabin."],
  ["Mazda", "CX-5", "SUV", "Gas", 28000, 28, ["Sport", "Touring", "Grand Touring"], "Upscale interior and engaging handling; strong safety scores."],
  ["Mazda", "Mazda3", "Hatchback", "Gas", 24000, 33, ["Select", "Preferred", "Premium"], "Premium feel for the price; sharp driving dynamics."],
  ["Subaru", "Outback", "Wagon", "Gas", 29000, 29, ["Base", "Premium", "Limited"], "Standard AWD; favorite for all-weather capability and safety."],
  ["Subaru", "Forester", "SUV", "Gas", 27000, 29, ["Base", "Premium", "Sport"], "Excellent visibility and AWD; IIHS Top Safety Pick+."],
  ["Hyundai", "Elantra", "Sedan", "Gas", 22000, 35, ["SE", "SEL", "Limited"], "Long warranty, modern tech, strong value proposition."],
  ["Hyundai", "Tucson", "SUV", "Gas", 27000, 28, ["SE", "SEL", "Limited"], "Bold design with America's-best warranty coverage."],
  ["Kia", "Sportage", "SUV", "Gas", 27000, 28, ["LX", "EX", "SX"], "Feature-rich and well-priced; 10yr/100k powertrain warranty."],
  ["Kia", "Telluride", "SUV", "Gas", 36000, 24, ["LX", "S", "EX", "SX"], "Multiple award winner; upscale 3-row family SUV."],
  ["Ford", "F-150", "Truck", "Gas", 38000, 20, ["XL", "XLT", "Lariat"], "America's best-selling truck for decades; huge configuration range."],
  ["Ford", "Escape", "SUV", "Gas", 28000, 28, ["S", "SE", "Titanium"], "Comfortable compact SUV with efficient powertrain options."],
  ["Ford", "Mustang", "Coupe", "Gas", 32000, 24, ["EcoBoost", "GT"], "Iconic American sports coupe; strong enthusiast following."],
  ["Chevrolet", "Silverado 1500", "Truck", "Gas", 38000, 19, ["WT", "LT", "RST"], "Capable full-size hauler with strong towing options."],
  ["Chevrolet", "Equinox", "SUV", "Gas", 27000, 28, ["LS", "LT", "Premier"], "Practical compact SUV; affordable and roomy."],
  ["Chevrolet", "Malibu", "Sedan", "Gas", 25000, 31, ["LS", "LT", "Premier"], "Roomy midsize sedan with good fuel economy."],
  ["Jeep", "Grand Cherokee", "SUV", "Gas", 38000, 22, ["Laredo", "Limited", "Overland"], "Premium off-road capability with refined on-road manners."],
  ["Jeep", "Wrangler", "SUV", "Gas", 35000, 20, ["Sport", "Sahara", "Rubicon"], "Unmatched off-road icon; exceptional resale value."],
  ["Nissan", "Rogue", "SUV", "Gas", 27000, 30, ["S", "SV", "SL"], "Comfortable commuter SUV with good safety tech."],
  ["Nissan", "Altima", "Sedan", "Gas", 25000, 32, ["S", "SV", "SR"], "Comfortable midsize with available AWD."],
  ["Tesla", "Model 3", "Sedan", "EV", 42000, 132, ["Standard Range", "Long Range", "Performance"], "Benchmark EV; class-leading software and charging network."],
  ["Tesla", "Model Y", "SUV", "EV", 48000, 122, ["Long Range", "Performance"], "Best-selling EV worldwide; versatile and quick."],
  ["Chevrolet", "Bolt EV", "Hatchback", "EV", 27000, 120, ["LT", "Premier"], "Affordable EV with practical range; great city car."],
  ["Hyundai", "Ioniq 5", "SUV", "EV", 42000, 114, ["SE", "SEL", "Limited"], "Award-winning design with ultra-fast 800V charging."],
  ["BMW", "3 Series", "Sedan", "Gas", 44000, 28, ["330i", "M340i"], "Sport-sedan benchmark; premium dynamics (higher upkeep)."],
  ["BMW", "X3", "SUV", "Gas", 46000, 25, ["sDrive30i", "xDrive30i"], "Premium compact SUV with sporty handling."],
  ["Lexus", "RX 350", "SUV", "Gas", 48000, 24, ["Base", "Premium", "Luxury"], "Top-rated luxury SUV for reliability and comfort."],
  ["Lexus", "ES 350", "Sedan", "Gas", 42000, 26, ["Base", "Luxury"], "Quiet, plush luxury sedan with excellent dependability."],
  ["Toyota", "Prius", "Hatchback", "Hybrid", 28000, 56, ["LE", "XLE", "Limited"], "Hybrid pioneer; outstanding fuel economy, redesigned styling."],
  ["Ford", "Explorer", "SUV", "Gas", 37000, 23, ["Base", "XLT", "Limited"], "Popular 3-row family SUV with strong powertrains."],
  ["Dodge", "Charger", "Sedan", "Gas", 33000, 23, ["SXT", "GT", "R/T"], "Bold full-size performance sedan with muscle-car character."],
  ["Volkswagen", "Jetta", "Sedan", "Gas", 23000, 34, ["S", "SE", "SEL"], "German-engineered compact with solid highway manners."],
  ["GMC", "Sierra 1500", "Truck", "Gas", 39000, 19, ["Pro", "SLE", "SLT"], "Refined full-size truck sharing Silverado underpinnings."],
];

const FRANCHISE_DEALERS = [
  ["Capital City Toyota", "Springfield", "VA", "22150", 6],
  ["Arlington Honda", "Arlington", "VA", "22201", 9],
  ["Alexandria Ford", "Alexandria", "VA", "22301", 12],
  ["Fairfax Chevrolet", "Fairfax", "VA", "22030", 14],
  ["Bethesda Lexus", "Bethesda", "MD", "20814", 18],
  ["Rockville Hyundai", "Rockville", "MD", "20850", 22],
  ["Tysons BMW", "Tysons", "VA", "22102", 11],
  ["McLean Subaru", "McLean", "VA", "22101", 13],
];

const INDEPENDENT_DEALERS = [
  ["Summit Pre-Owned", "Alexandria", "VA", "22304", 12],
  ["Gateway Used Cars", "Fairfax", "VA", "22031", 14],
  ["Crossroads Motors", "Rockville", "MD", "20852", 22],
  ["Liberty Auto Sales", "Silver Spring", "MD", "20910", 24],
  ["Beltway Car Center", "Tysons", "VA", "22182", 11],
  ["Metro Select Motors", "Washington", "DC", "20001", 8],
];

const PRIVATE_NAMES = [
  "Mark T.", "Sarah L.", "David R.", "Jen K.", "Carlos M.",
  "Priya S.", "Tom B.", "Angela W.", "Greg P.", "Nina H.",
];
const PRIVATE_LOCS = [
  ["Springfield", "VA", "22151", 7],
  ["Arlington", "VA", "22203", 10],
  ["Reston", "VA", "20190", 16],
  ["Gaithersburg", "MD", "20878", 25],
  ["Falls Church", "VA", "22042", 9],
  ["Hyattsville", "MD", "20782", 13],
];

const COLORS = ["Pearl White", "Midnight Black", "Silver Metallic", "Graphite Gray", "Deep Blue", "Crimson Red", "Forest Green", "Beige"];

// Region flags to demo "what to watch for" (used cars only; unverified in UI).
const FLAGS = [
  null, null, null, null, null, null, // most have none
  "Registered in a coastal/flood-prone county — verify for water damage.",
  "High-salt winter region — inspect for undercarriage corrosion.",
  "Former fleet/rental region — confirm service consistency.",
  "Hail-prone area — check panels for filler/repaint.",
];

function warrantyFor(make) {
  const longWarranty = ["Hyundai", "Kia"];
  if (longWarranty.includes(make)) return "5yr/60k basic · 10yr/100k powertrain";
  if (["BMW", "Lexus"].includes(make)) return "4yr/50k basic · 6yr/70k powertrain";
  return "3yr/36k basic · 5yr/60k powertrain";
}

let seed = 20260608;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// Plausible-looking 17-char VIN (no I/O/Q). Not a real-world valid check digit.
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
function makeVin() {
  let v = "";
  for (let i = 0; i < 17; i++) v += VIN_CHARS[Math.floor(rand() * VIN_CHARS.length)];
  return v;
}

// Photo provenance is honest: seeded cars use stock/model imagery, never faked
// as real dealer shots. The body-style photo URL is resolved in provider.ts.
function photosFor(condition) {
  // Most seeded listings carry one stock model image. A subset of dealer
  // listings demo the "dealer-supplied photo" credibility path.
  const hasDealerPhotos = condition === "Used" && rand() < 0.35;
  if (hasDealerPhotos) {
    return { kind: "dealer", count: randInt(2, 4) };
  }
  return { kind: "stock", count: 1 };
}

const listings = [];
let idx = 0;

function addListing(condition) {
  idx += 1;
  const [make, model, bodyStyle, fuel, baseMsrp, mpg, trims, reputation] = pick(CATALOG);
  const trim = pick(trims);
  const color = pick(COLORS);

  let year, mileage, price, msrp, sellerType, dealerName, city, state, zip, baseDist, sellerTenure, regionFlags, warranty, modelReputation;

  if (condition === "New") {
    year = randInt(CURRENT_YEAR, CURRENT_YEAR); // current model year
    mileage = randInt(2, 40); // delivery miles
    // New price: MSRP plus small market adjustment, rounded.
    msrp = baseMsrp + randInt(0, 4) * 250;
    price = Math.round((msrp * (1 + (rand() * 0.04 - 0.01))) / 50) * 50;
    sellerType = "Franchise Dealer";
    // Match the franchise to the make so a new Mazda isn't sold by a Honda store.
    const loc = pick(FRANCHISE_DEALERS);
    city = loc[1]; state = loc[2]; zip = loc[3]; baseDist = loc[4];
    dealerName = `${city} ${make}`;
    sellerTenure = `Authorized ${make} dealer`;
    regionFlags = [];
    warranty = warrantyFor(make);
    modelReputation = reputation;
  } else {
    const age = randInt(1, 12);
    year = CURRENT_YEAR - age;
    const perYear = randInt(7000, 16000);
    const m = Math.min(195000, perYear * age + randInt(-5000, 8000));
    mileage = Math.max(4000, m);
    const ageDep = Math.pow(0.86, age);
    const mileagePenalty = Math.max(0.6, 1 - (mileage / 200000) * 0.5);
    price = Math.max(4500, Math.round((baseMsrp * ageDep * mileagePenalty) / 250) * 250);
    msrp = baseMsrp;

    // Seller type distribution: franchise CPO, independent lot, or private.
    const r = rand();
    if (r < 0.4) {
      sellerType = "Franchise Dealer";
      const d = pick(FRANCHISE_DEALERS);
      [dealerName, city, state, zip, baseDist] = d;
      sellerTenure = "Certified Pre-Owned available";
    } else if (r < 0.75) {
      sellerType = "Independent Dealer";
      const d = pick(INDEPENDENT_DEALERS);
      [dealerName, city, state, zip, baseDist] = d;
      sellerTenure = `${randInt(5, 25)} yrs in business`;
    } else {
      sellerType = "Private Seller";
      const loc = pick(PRIVATE_LOCS);
      [city, state, zip, baseDist] = loc;
      dealerName = `Private Seller — ${pick(PRIVATE_NAMES)}`;
      sellerTenure = "Individual owner";
    }
    const flag = pick(FLAGS);
    regionFlags = flag ? [flag] : [];
    warranty = age <= 3 ? "May have remaining factory warranty — verify with VIN" : undefined;
    modelReputation = undefined;
  }

  const distanceMiles = Math.max(2, baseDist + randInt(-3, 6));
  const photo = photosFor(condition);

  const blurb =
    condition === "New"
      ? `Brand-new ${year} ${make} ${model} ${trim} in ${color.toLowerCase()}. Full factory warranty, ${mileage} delivery miles, at ${dealerName}.`
      : sellerType === "Private Seller"
        ? `${year} ${make} ${model} ${trim} in ${color.toLowerCase()}, sold by owner. Well cared for; clean and ready to drive.`
        : `${year} ${make} ${model} ${trim} in ${color.toLowerCase()}. Inspected and priced to move at ${dealerName}.`;

  listings.push({
    id: `lst_${String(idx).padStart(3, "0")}`,
    vin: makeVin(),
    condition,
    year,
    make,
    model,
    trim,
    bodyStyle,
    fuel,
    price,
    msrp,
    mileage,
    mpg,
    exteriorColor: color,
    sellerType,
    dealerName,
    sellerTenure,
    city,
    state,
    distanceMiles,
    zip,
    // photos array is filled with provenance-tagged URLs in provider.ts;
    // here we only record how many and what kind.
    _photoKind: photo.kind,
    _photoCount: photo.count,
    photos: [],
    dealerBlurb: blurb,
    warranty,
    modelReputation,
    regionFlags,
  });
}

// ~60 used + ~30 new
for (let i = 0; i < 60; i++) addListing("Used");
for (let i = 0; i < 30; i++) addListing("New");

process.stdout.write(JSON.stringify(listings, null, 2));
