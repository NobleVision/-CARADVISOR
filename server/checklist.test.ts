import { describe, expect, it } from "vitest";
import { buildChecklist, checklistToText } from "./checklist";
import { findAdvisories } from "./knowledge/lookup";

const allItems = (c: ReturnType<typeof buildChecklist>) =>
  c.sections.flatMap((s) => s.items.map((i) => i.text));

describe("buildChecklist", () => {
  it("always includes a critical PPI and a critical history-report item", () => {
    const c = buildChecklist({
      year: 2017,
      make: "Toyota",
      model: "Camry",
      sellerType: "Franchise Dealer",
      advisories: [],
    });
    const criticals = c.sections.flatMap((s) => s.items.filter((i) => i.critical).map((i) => i.text));
    expect(criticals.some((t) => /pre-purchase inspection/i.test(t))).toBe(true);
    expect(criticals.some((t) => /history report/i.test(t))).toBe(true);
  });

  it("includes the three dealer questions for dealers only", () => {
    const dealer = buildChecklist({
      year: 2017, make: "Toyota", model: "Camry", sellerType: "Independent Dealer", advisories: [],
    });
    const priv = buildChecklist({
      year: 2017, make: "Toyota", model: "Camry", sellerType: "Private Seller", advisories: [],
    });
    expect(dealer.dealerQuestions).toHaveLength(3);
    expect(dealer.dealerQuestions[0]).toMatch(/processing fee/i);
    expect(dealer.dealerEvasionRule).toMatch(/walk away/i);
    expect(priv.dealerQuestions).toHaveLength(0);
  });

  it("adds title/lien/payment items for private sellers", () => {
    const c = buildChecklist({
      year: 2013, make: "Mazda", model: "Mazda3", sellerType: "Private Seller", advisories: [],
    });
    const items = allItems(c);
    expect(items.some((t) => /liens/i.test(t))).toBe(true);
    expect(items.some((t) => /secure payment/i.test(t))).toBe(true);
  });

  it("injects model-specific checks for a CVT trap car", () => {
    const advisories = findAdvisories({ make: "Nissan", model: "Sentra", year: 2014 });
    const c = buildChecklist({
      year: 2014, make: "Nissan", model: "Sentra", sellerType: "Independent Dealer", advisories,
    });
    const items = allItems(c);
    expect(items.some((t) => /transmission type FIRST/i.test(t))).toBe(true);
    expect(items.some((t) => /CVT whine/i.test(t))).toBe(true);
  });

  it("makes the insurance quote critical for theft-target models", () => {
    const advisories = findAdvisories({ make: "Hyundai", model: "Elantra", year: 2013 });
    const c = buildChecklist({
      year: 2013, make: "Hyundai", model: "Elantra", sellerType: "Independent Dealer", advisories,
    });
    const critical = c.sections
      .flatMap((s) => s.items)
      .find((i) => /insurance quote/i.test(i.text));
    expect(critical?.critical).toBe(true);
  });

  it("adds high-mileage and regional-flag items", () => {
    const c = buildChecklist({
      year: 2012,
      make: "Toyota",
      model: "Camry",
      mileage: 140000,
      sellerType: "Franchise Dealer",
      regionFlags: ["Coastal/flood-prone county — check for water damage"],
      advisories: [],
    });
    const items = allItems(c);
    expect(items.some((t) => /timing belt\/chain/i.test(t))).toBe(true);
    expect(items.some((t) => /flood-prone/i.test(t))).toBe(true);
  });

  it("celebrates a manual-waived defect instead of warning", () => {
    const advisories = findAdvisories({
      make: "Ford", model: "Focus", year: 2014, transmissionStyle: "Manual/Standard",
    });
    const c = buildChecklist({
      year: 2014, make: "Ford", model: "Focus", sellerType: "Private Seller", advisories,
    });
    const items = allItems(c);
    expect(items.some((t) => /Good news/i.test(t))).toBe(true);
  });

  it("renders a copyable plain-text version", () => {
    const advisories = findAdvisories({ make: "Nissan", model: "Sentra", year: 2014 });
    const c = buildChecklist({
      year: 2014, make: "Nissan", model: "Sentra", sellerType: "Franchise Dealer", advisories,
    });
    const text = checklistToText(c);
    expect(text).toContain("2014 Nissan Sentra");
    expect(text).toContain("SMART QUESTIONS FOR THE DEALER");
    expect(text).toContain("GOLDEN RULES");
    expect(text).toMatch(/\[ \]/);
  });
});
