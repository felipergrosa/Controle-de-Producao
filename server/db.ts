import { sql, eq, and, like, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, products, productionEntries, productionDaySnapshots, productHistory, Product, ProductionEntry, ProductionDaySnapshot, ProductHistory, InsertProductHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let pool: ReturnType<typeof mysql.createPool> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[Database] DATABASE_URL is not configured");
    return null;
  }

  try {
    if (!pool) {
      pool = mysql.createPool(connectionString);
    }
    _db = drizzle(pool as any) as ReturnType<typeof drizzle>;
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

// Products queries
export async function getProductByCode(code: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  if (query.length < 2) return [];
  
  const upperQuery = query.toUpperCase();
  const result = await db
    .select()
    .from(products)
    .where(like(products.code, `%${upperQuery}%`))
    .limit(50);
  return result;
}

export async function searchProductsByDescription(query: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  if (query.length < 2) return [];
  
  const upperQuery = query.toUpperCase();
  const result = await db
    .select()
    .from(products)
    .where(like(products.description, `%${upperQuery}%`))
    .limit(50);
  return result;
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products);
}

export async function createOrUpdateProduct(code: string, description: string, photoUrl?: string, barcode?: string): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getProductByCode(code);
  if (existing) {
    const now = new Date();
    await db.update(products)
      .set({ description, photoUrl, barcode, updatedAt: now })
      .where(eq(products.code, code));
    return { ...existing, description, photoUrl: photoUrl ?? existing.photoUrl, barcode: barcode ?? existing.barcode, updatedAt: now };
  }
  
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(products).values({
    id,
    code,
    description,
    photoUrl,
    barcode: barcode ?? null,
    totalProduced: 0,
    lastProducedAt: undefined,
    createdAt: now,
    updatedAt: now,
  });
  return { id, code, description, photoUrl: photoUrl ?? null, barcode: barcode ?? null, totalProduced: 0, lastProducedAt: null, createdAt: now, updatedAt: now };
}

// Production entries queries
export async function getProductionEntriesByDate(sessionDate: Date): Promise<ProductionEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const dateStr = new Date(sessionDate).toISOString().split('T')[0];
  const result = await db
    .select()
    .from(productionEntries)
    .where(sql`CAST(${productionEntries.sessionDate} AS CHAR) = ${dateStr}`)
    .orderBy(desc(productionEntries.insertedAt));
  return result;
}

export async function getProductionEntryByProductAndDate(productId: string, sessionDate: Date): Promise<ProductionEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const dateStr = new Date(sessionDate).toISOString().split('T')[0];
  const result = await db
    .select()
    .from(productionEntries)
    .where(
      and(
        eq(productionEntries.productId, productId),
        eq(productionEntries.sessionDate, dateStr as any)
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getTodayProductionSummary(sessionDate: Date): Promise<{ totalItems: number; totalQuantity: number }> {
  const db = await getDb();
  if (!db) return { totalItems: 0, totalQuantity: 0 };
  
  const dateStr = new Date(sessionDate).toISOString().split('T')[0];
  const entries = await db
    .select()
    .from(productionEntries)
    .where(eq(productionEntries.sessionDate, dateStr as any));
  
  return {
    totalItems: entries.length,
    totalQuantity: entries.reduce((sum, e) => sum + e.quantity, 0),
  };
}

// Production day snapshots queries
export async function getSnapshotByDate(sessionDate: Date): Promise<ProductionDaySnapshot | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const dateStr = new Date(sessionDate).toISOString().split('T')[0];
  const result = await db
    .select()
    .from(productionDaySnapshots)
    .where(eq(productionDaySnapshots.sessionDate, new Date(dateStr)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Product history queries
export async function addProductHistory(
  productId: string,
  productCode: string,
  quantity: number,
  type: "production" | "adjustment" | "import" = "production",
  notes?: string,
  createdBy?: string
): Promise<ProductHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = crypto.randomUUID();
  const now = new Date();
  
  await db.insert(productHistory).values({
    id,
    productId,
    productCode,
    quantity,
    type,
    notes,
    createdBy,
    createdAt: now,
  });
  
  return { id, productId, productCode, quantity, type, notes: notes ?? null, createdBy: createdBy ?? null, createdAt: now };
}

export async function getProductHistory(productId: string): Promise<ProductHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(productHistory)
    .where(eq(productHistory.productId, productId))
    .orderBy(desc(productHistory.createdAt));
}

export async function updateProductStats(productId: string, quantity: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const now = new Date();
  await db.update(products)
    .set({ 
      totalProduced: quantity,
      lastProducedAt: now,
      updatedAt: now,
    })
    .where(eq(products.id, productId));
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(products).where(eq(products.id, productId));
}

export async function updateProductByCode(
  code: string,
  updates: { description?: string; photoUrl?: string; barcode?: string }
): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const now = new Date();
  await db.update(products)
    .set({ ...updates, updatedAt: now })
    .where(eq(products.code, code));
  
  const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// Dashboard Analytics Queries
export async function getProductionByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  return await db
    .select({
      date: productionDaySnapshots.sessionDate,
      totalItems: productionDaySnapshots.totalItems,
      totalQuantity: productionDaySnapshots.totalQuantity,
    })
    .from(productionDaySnapshots)
    .where(
      sql`${productionDaySnapshots.sessionDate} >= ${startDate} AND ${productionDaySnapshots.sessionDate} <= ${endDate}`
    )
    .orderBy(productionDaySnapshots.sessionDate);
}

export async function getTopProductsByQuantity(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  const rows = await db
    .select({
      code: productionEntries.productCode,
      description: productionEntries.productDescription,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${startDate} AND ${productionEntries.sessionDate} <= ${endDate}`
    )
    .groupBy(productionEntries.productCode, productionEntries.productDescription)
    .orderBy(sql`SUM(${productionEntries.quantity}) DESC`)
    .limit(limit);

  return rows.map((row) => ({
    code: row.code,
    description: row.description,
    totalQuantity: Number(row.totalQuantity ?? 0),
    count: Number(row.count ?? 0),
  }));
}

export async function getProductionStats(startDate: Date, endDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return {
    totalQuantity: 0,
    totalItems: 0,
    uniqueProducts: 0,
    averagePerDay: 0,
  };
  
  const { sql } = await import("drizzle-orm");
  
  const result = await db
    .select({
      totalQuantity: sql<number>`COALESCE(SUM(${productionEntries.quantity}), 0)`,
      totalItems: sql<number>`COALESCE(COUNT(${productionEntries.id}), 0)`,
      uniqueProducts: sql<number>`COALESCE(COUNT(DISTINCT ${productionEntries.productCode}), 0)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${startDate} AND ${productionEntries.sessionDate} <= ${endDate}`
    );

  const summary = result.length > 0 ? result[0] : null;

  const trend = await getDailyProductionTrend(startDate, endDate);
  const averagePerDay = trend.length
    ? trend.reduce((acc, day) => acc + Number(day.totalQuantity ?? 0), 0) / trend.length
    : 0;

  return {
    totalQuantity: Number(summary?.totalQuantity ?? 0),
    totalItems: Number(summary?.totalItems ?? 0),
    uniqueProducts: Number(summary?.uniqueProducts ?? 0),
    averagePerDay,
  };
}

export async function getDailyProductionTrend(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  const rows = await db
    .select({
      date: sql<string>`DATE(${productionEntries.sessionDate})`,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
      totalItems: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${startDate} AND ${productionEntries.sessionDate} <= ${endDate}`
    )
    .groupBy(sql`DATE(${productionEntries.sessionDate})`)
    .orderBy(sql`DATE(${productionEntries.sessionDate})`);

  return rows.map((row) => ({
    date: row.date,
    totalQuantity: Number(row.totalQuantity ?? 0),
    totalItems: Number(row.totalItems ?? 0),
  }));
}

// Product Movement History Queries
export async function getProductMovementHistory(productId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: productHistory.id,
      productCode: productHistory.productCode,
      quantity: productHistory.quantity,
      type: productHistory.type,
      notes: productHistory.notes,
      createdBy: productHistory.createdBy,
      createdAt: productHistory.createdAt,
    })
    .from(productHistory)
    .where(eq(productHistory.productId, productId))
    .orderBy(desc(productHistory.createdAt));
}

export async function getProductMovementByDateRange(productId: string, startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  return await db
    .select({
      id: productHistory.id,
      productCode: productHistory.productCode,
      quantity: productHistory.quantity,
      type: productHistory.type,
      notes: productHistory.notes,
      createdBy: productHistory.createdBy,
      createdAt: productHistory.createdAt,
    })
    .from(productHistory)
    .where(
      sql`${productHistory.productId} = ${productId} AND ${productHistory.createdAt} >= ${startDate} AND ${productHistory.createdAt} <= ${endDate}`
    )
    .orderBy(desc(productHistory.createdAt));
}

export async function getProductMovementSummary(productId: string): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  const { sql } = await import("drizzle-orm");
  
  const result = await db
    .select({
      totalProduced: sql<number>`SUM(CASE WHEN ${productHistory.type} = 'production' THEN ${productHistory.quantity} ELSE 0 END)` ,
      totalAdjustments: sql<number>`SUM(CASE WHEN ${productHistory.type} = 'adjustment' THEN ${productHistory.quantity} ELSE 0 END)` ,
      totalImported: sql<number>`SUM(CASE WHEN ${productHistory.type} = 'import' THEN ${productHistory.quantity} ELSE 0 END)` ,
      movementCount: sql<number>`COUNT(*)` ,
      lastMovement: sql<Date>`MAX(${productHistory.createdAt})` ,
    })
    .from(productHistory)
    .where(eq(productHistory.productId, productId));
  
  return result.length > 0 ? result[0] : null;
}

export async function getProductionByType(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  return await db
    .select({
      type: productHistory.type,
      totalQuantity: sql<number>`SUM(${productHistory.quantity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productHistory)
    .where(
      sql`${productHistory.createdAt} >= ${startDate} AND ${productHistory.createdAt} <= ${endDate}`
    )
    .groupBy(productHistory.type);
}
