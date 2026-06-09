import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Postgres enum types. */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "price_drop",
  "new_match",
]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Shared shape of a decoded + scored vehicle, persisted as JSON.
 */
export type DecodedVehicle = {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  trim: string;
  vehicleType: string;
  bodyClass: string;
  driveType: string;
  fuelType: string;
  engineCylinders: string;
  engineHP: string;
  engineDisplacementL: string;
  transmissionStyle: string;
  transmissionSpeeds: string;
  doors: string;
  manufacturer: string;
  plantCountry: string;
  plantCity: string;
  plantState: string;
  electrificationLevel: string;
  gvwr: string;
  safetyFeatures: { label: string; value: string }[];
  raw: Record<string, string>;
};

export type ScoreBreakdown = {
  overall: number; // 0-100
  grade: string; // e.g. "A", "B+"
  reliability: number;
  safety: number;
  ageMileage: number;
  efficiency: number;
  notes: string[];
};

/** Persisted Find-My-Car buyer criteria for saved searches (kept structural to
 * avoid coupling the schema to server-only types; cast to BuyerCriteria in app code). */
export type SavedSearchCriteria = Record<string, unknown>;

/**
 * Search history: every VIN a user decodes is logged here.
 */
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  vin: varchar("vin", { length: 17 }).notNull(),
  make: varchar("make", { length: 64 }),
  model: varchar("model", { length: 128 }),
  modelYear: varchar("modelYear", { length: 8 }),
  mileage: integer("mileage"),
  score: integer("score"),
  grade: varchar("grade", { length: 4 }),
  vehicleData: jsonb("vehicleData").$type<DecodedVehicle>(),
  scoreData: jsonb("scoreData").$type<ScoreBreakdown>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * Saved (bookmarked) vehicles a user wants to track across sessions.
 * `priceAtSave` / `lastKnownPrice` back the Garage price-drop tracker.
 */
export const savedVehicles = pgTable("saved_vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  vin: varchar("vin", { length: 17 }).notNull(),
  listingId: varchar("listingId", { length: 64 }),
  make: varchar("make", { length: 64 }),
  model: varchar("model", { length: 128 }),
  modelYear: varchar("modelYear", { length: 8 }),
  mileage: integer("mileage"),
  score: integer("score"),
  grade: varchar("grade", { length: 4 }),
  priceAtSave: integer("priceAtSave"),
  lastKnownPrice: integer("lastKnownPrice"),
  nickname: varchar("nickname", { length: 128 }),
  notes: text("notes"),
  vehicleData: jsonb("vehicleData").$type<DecodedVehicle>(),
  scoreData: jsonb("scoreData").$type<ScoreBreakdown>(),
  isSaved: boolean("isSaved").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type SavedVehicle = typeof savedVehicles.$inferSelect;
export type InsertSavedVehicle = typeof savedVehicles.$inferInsert;

/**
 * Logged "contact seller" inquiries (tailored message templates the buyer
 * generated for a private owner or a dealership).
 */
export const sellerInquiries = pgTable("seller_inquiries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  vin: varchar("vin", { length: 17 }),
  listingId: varchar("listingId", { length: 64 }),
  sellerType: varchar("sellerType", { length: 32 }),
  templateKind: varchar("templateKind", { length: 64 }),
  message: text("message"),
  status: varchar("status", { length: 24 }).default("drafted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SellerInquiry = typeof sellerInquiries.$inferSelect;
export type InsertSellerInquiry = typeof sellerInquiries.$inferInsert;

/**
 * Price snapshots per listing — powers the Garage price-drop tracker and the
 * sparkline on saved vehicles.
 */
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  listingId: varchar("listingId", { length: 64 }).notNull(),
  vin: varchar("vin", { length: 17 }),
  price: integer("price").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Saved Find-My-Car profiles. The monitor cron re-runs each active search and
 * notifies the owner when new matching listings appear.
 */
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 160 }),
  criteria: jsonb("criteria").$type<SavedSearchCriteria>().notNull(),
  active: boolean("active").default(true).notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastSeenListingIds: jsonb("lastSeenListingIds").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

/**
 * In-app notifications center: price drops on saved vehicles and new matches
 * for saved searches.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  listingId: varchar("listingId", { length: 64 }),
  vin: varchar("vin", { length: 17 }),
  savedSearchId: integer("savedSearchId"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
