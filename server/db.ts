import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// Neon's HTTP driver is stateless per query, which is ideal for serverless
// (no lingering connection pool to leak across Vercel function invocations).
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ----- Used Car Advisor feature queries -----
import { and, desc } from "drizzle-orm";
import {
  InsertSavedVehicle,
  InsertSearchHistory,
  savedVehicles,
  searchHistory,
} from "../drizzle/schema";

export async function addSearchHistory(entry: InsertSearchHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchHistory).values(entry);
}

export async function getSearchHistory(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(limit);
}

export async function clearSearchHistory(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
}

export async function deleteSearchHistoryItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(searchHistory)
    .where(and(eq(searchHistory.userId, userId), eq(searchHistory.id, id)));
}

export async function getSavedVehicles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedVehicles)
    .where(eq(savedVehicles.userId, userId))
    .orderBy(desc(savedVehicles.updatedAt));
}

export async function getSavedVehicleByVin(userId: number, vin: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(savedVehicles)
    .where(and(eq(savedVehicles.userId, userId), eq(savedVehicles.vin, vin)))
    .limit(1);
  return rows[0];
}

export async function saveVehicle(entry: InsertSavedVehicle) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSavedVehicleByVin(entry.userId, entry.vin);
  if (existing) {
    await db
      .update(savedVehicles)
      .set({
        nickname: entry.nickname,
        notes: entry.notes,
        mileage: entry.mileage,
        score: entry.score,
        grade: entry.grade,
        listingId: entry.listingId,
        // Keep the original priceAtSave; refresh the latest known price.
        lastKnownPrice: entry.lastKnownPrice ?? entry.priceAtSave,
        vehicleData: entry.vehicleData,
        scoreData: entry.scoreData,
      })
      .where(eq(savedVehicles.id, existing.id));
    return existing.id;
  }
  const res = await db.insert(savedVehicles).values(entry);
  return res;
}

export async function unsaveVehicle(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedVehicles)
    .where(and(eq(savedVehicles.userId, userId), eq(savedVehicles.id, id)));
}

export async function updateSavedVehicleMeta(
  userId: number,
  id: number,
  meta: { nickname?: string; notes?: string },
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(savedVehicles)
    .set(meta)
    .where(and(eq(savedVehicles.userId, userId), eq(savedVehicles.id, id)));
}

// ----- Price-drop tracker, saved searches & notifications -----
import { isNull } from "drizzle-orm";
import {
  InsertNotification,
  InsertPriceHistory,
  InsertSavedSearch,
  InsertSellerInquiry,
  notifications,
  priceHistory,
  savedSearches,
  sellerInquiries,
} from "../drizzle/schema";

/** Every saved vehicle across all users — used by the monitor cron. */
export async function getAllSavedVehicles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedVehicles);
}

export async function updateSavedVehiclePrice(id: number, price: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(savedVehicles)
    .set({ lastKnownPrice: price })
    .where(eq(savedVehicles.id, id));
}

export async function recordPrice(entry: InsertPriceHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceHistory).values(entry);
}

export async function getPriceHistory(listingId: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.listingId, listingId))
    .orderBy(desc(priceHistory.recordedAt))
    .limit(limit);
}

export async function getLatestRecordedPrice(listingId: string) {
  const rows = await getPriceHistory(listingId, 1);
  return rows[0]?.price;
}

export async function createSavedSearch(entry: InsertSavedSearch) {
  const db = await getDb();
  if (!db) return;
  await db.insert(savedSearches).values(entry);
}

export async function getSavedSearches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}

export async function getActiveSavedSearches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedSearches).where(eq(savedSearches.active, true));
}

export async function setSavedSearchActive(
  userId: number,
  id: number,
  active: boolean,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(savedSearches)
    .set({ active })
    .where(and(eq(savedSearches.userId, userId), eq(savedSearches.id, id)));
}

export async function deleteSavedSearch(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.userId, userId), eq(savedSearches.id, id)));
}

export async function markSavedSearchChecked(id: number, seenIds: string[]) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(savedSearches)
    .set({ lastCheckedAt: new Date(), lastSeenListingIds: seenIds })
    .where(eq(savedSearches.id, id));
}

export async function addNotification(entry: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(entry);
}

export async function getNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markNotificationRead(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function logSellerInquiry(entry: InsertSellerInquiry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(sellerInquiries).values(entry);
}
