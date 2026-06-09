import type { SellerType } from "../inventory/types";

/**
 * Tailored "contact the seller" message templates. Bodies differ for a private
 * owner vs. a dealership (franchise/independent): private-sale outreach stresses
 * title/lien checks and safe payment; dealer outreach stresses out-the-door
 * pricing, fees, history reports and warranty.
 */
export type ContactTemplateKind = "inquiry" | "price" | "inspection" | "paperwork";

export type ContactContext = {
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  price?: number;
  mileage?: number;
  sellerType: SellerType;
  dealerName?: string;
  city?: string;
  state?: string;
  buyerName?: string;
  buyerNotes?: string;
};

export type ContactTemplate = {
  kind: ContactTemplateKind;
  label: string;
  subject: string;
  body: string;
};

export const TEMPLATE_KIND_LABELS: Record<ContactTemplateKind, string> = {
  inquiry: "Initial inquiry",
  price: "Make an offer",
  inspection: "Test drive & inspection",
  paperwork: "Closing checklist",
};

function vehicleLabel(c: ContactContext): string {
  return `${c.year} ${c.make} ${c.model}${c.trim ? ` ${c.trim}` : ""}`.trim();
}

function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function signOff(c: ContactContext): string {
  return c.buyerName ? `Thanks,\n${c.buyerName}` : "Thanks!";
}

function notesBlock(c: ContactContext): string {
  return c.buyerNotes && c.buyerNotes.trim()
    ? `\n\nA quick note: ${c.buyerNotes.trim()}`
    : "";
}

function isPrivate(c: ContactContext): boolean {
  return c.sellerType === "Private Seller";
}

function buildOne(c: ContactContext, kind: ContactTemplateKind): ContactTemplate {
  const v = vehicleLabel(c);
  const priceStr = typeof c.price === "number" ? money(c.price) : "the listed price";
  const vinStr = c.vin ? ` (VIN ${c.vin})` : "";
  const dealerHello = c.dealerName ? ` ${c.dealerName} team` : " team";
  const suggestedOffer =
    typeof c.price === "number"
      ? money(Math.round((c.price * 0.92) / 100) * 100)
      : "[your offer]";
  const otdTarget =
    typeof c.price === "number"
      ? `${money(c.price)} out-the-door (rolling fees and taxes into the advertised price)`
      : "[your target out-the-door price]";

  let subject = "";
  let body = "";

  if (kind === "inquiry") {
    if (isPrivate(c)) {
      subject = `Is your ${v} still available?`;
      body = `Hi there,

I saw your listing for the ${v}${typeof c.price === "number" ? ` at ${priceStr}` : ""} and I'm very interested. Is it still available?

A few quick questions before I come take a look:
- Do you have the title in hand and in your name, free of any liens?
- Can you share the maintenance/service records?
- What's the main reason you're selling?
- Any mechanical issues, warning lights, or accidents I should know about?${
        c.mileage ? `\n- Can you confirm the current mileage (listing shows ${c.mileage.toLocaleString()})?` : ""
      }

I can meet at a public spot that works for you.${notesBlock(c)}

${signOff(c)}`;
    } else {
      subject = `Availability + out-the-door price on the ${v}`;
      body = `Hello${dealerHello},

I'm interested in the ${v}${vinStr}${typeof c.price === "number" ? `, listed at ${priceStr}` : ""}. Is it still available and on the lot?

Could you please send:
- The full out-the-door price including all fees, taxes, and add-ons
- A vehicle history report (Carfax/AutoCheck) if available
- Whether it's certified pre-owned and any remaining/extended warranty
- Any recent service or reconditioning done

I'm a serious buyer and can move quickly on the right car.${notesBlock(c)}

${signOff(c)}`;
    }
  } else if (kind === "price") {
    if (isPrivate(c)) {
      subject = `Offer on your ${v}`;
      body = `Hi,

Thanks for the details on the ${v}. Based on comparable listings — and budgeting for an independent inspection and any near-term maintenance — I'd like to offer ${suggestedOffer}.

I'm ready to move quickly with a cashier's check or secure payment once we've verified the title and done a quick pre-purchase inspection. Would you consider that? Happy to meet in the middle if we're close.${notesBlock(c)}

${signOff(c)}`;
    } else {
      subject = `Out-the-door offer on the ${v}`;
      body = `Hello,

I'd like to make an offer on the ${v}${vinStr}. I've been comparing similar vehicles nearby, so I'm focused on the all-in, out-the-door number rather than the advertised price.

I'm targeting ${otdTarget}. If we can agree on that, I'm ready to put down a deposit today. Could you also itemize the doc fee and any dealer add-ons?${notesBlock(c)}

${signOff(c)}`;
    }
  } else if (kind === "inspection") {
    if (isPrivate(c)) {
      subject = `Test drive + quick inspection for the ${v}?`;
      body = `Hi,

The ${v} looks like a great fit. Could we set up a time for a test drive? I'd also like to have a quick pre-purchase inspection done by a local mechanic (about an hour, at my cost) before we finalize — standard due diligence.

What days/times work for you this week? I'm flexible and can come to you.${notesBlock(c)}

${signOff(c)}`;
    } else {
      subject = `Scheduling a test drive for the ${v}`;
      body = `Hello,

I'd like to schedule a test drive for the ${v}${vinStr}. Could you confirm it's on-site and share your availability${c.city ? ` at your ${c.city} location` : ""}?

I may also take it to an independent mechanic for a pre-purchase inspection before buying — can you accommodate that?${notesBlock(c)}

${signOff(c)}`;
    }
  } else {
    // paperwork
    if (isPrivate(c)) {
      subject = `Closing the sale on the ${v}`;
      body = `Hi,

Glad we could agree on the ${v}. To make the handoff smooth, here's what I'd like ready for both of us:
- Signed title transferred to me, free of liens (lien-release letter if it was financed)
- A simple bill of sale we both sign (date, price, VIN, odometer reading)
- A current odometer photo and any remaining service records
- Payment via cashier's check or bank escrow
- I'll handle registration and new plates at the DMV

Does that work? Let me know a good time and place to complete it.${notesBlock(c)}

${signOff(c)}`;
    } else {
      subject = `Paperwork for the ${v}`;
      body = `Hello,

Looking forward to picking up the ${v}. Before I come in, could you have the paperwork ready and email a preview if possible?
- Final buyer's order with the agreed out-the-door price (itemized fees/taxes)
- Any warranty / CPO documents and what's covered
- Financing terms (APR, term, total) if applicable — I may bring outside financing
- Confirmation of what's included (extra key, floor mats, owner's manual)

I'd like to avoid surprises at the desk. Thanks for making it easy!${notesBlock(c)}

${signOff(c)}`;
    }
  }

  return { kind, label: TEMPLATE_KIND_LABELS[kind], subject, body };
}

export const ALL_TEMPLATE_KINDS: ContactTemplateKind[] = [
  "inquiry",
  "price",
  "inspection",
  "paperwork",
];

/** Build all four tailored templates for a listing/seller context. */
export function buildTemplates(c: ContactContext): ContactTemplate[] {
  return ALL_TEMPLATE_KINDS.map((kind) => buildOne(c, kind));
}

/** Build a single template by kind. */
export function buildOneTemplate(
  c: ContactContext,
  kind: ContactTemplateKind
): ContactTemplate {
  return buildOne(c, kind);
}
