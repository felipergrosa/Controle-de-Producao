import { sql, eq, and, like, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, products, productionEntries, productionDaySnapshots, productHistory, Product, ProductionEntry, ProductionDaySnapshot, ProductHistory, InsertProductHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let pool: ReturnType<typeof mysql.createPool> | null = null;

function toDateOnlyString(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0];
}

function formatDateLongPtBR(value: Date | string): string {
  const baseDate = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(baseDate.getTime())) {
    return String(value);
  }

  const formatted = baseDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (!formatted) return String(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

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
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
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

  const trimmedQuery = query.trim();
  const upperQuery = trimmedQuery.toUpperCase();
  const result = await db
    .select()
    .from(products)
    .where(
      or(
        like(products.code, `%${upperQuery}%`),
        like(products.barcode, `%${trimmedQuery}%`),
        eq(products.barcode, trimmedQuery)
      )
    )
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
export async function getProductionEntriesByDate(sessionDate: Date): Promise<(ProductionEntry & {
  createdByName?: string | null;
  checkedByName?: string | null;
})[]> {
  const db = await getDb();
  if (!db) return [];
  
  const dateStr = new Date(sessionDate).toISOString().split('T')[0];
  const createdByUser = alias(users, "createdByUser");
  const checkedByUser = alias(users, "checkedByUser");

  const result = await db
    .select({
      entry: productionEntries,
      createdByName: createdByUser.name,
      checkedByName: checkedByUser.name,
    })
    .from(productionEntries)
    .leftJoin(createdByUser, eq(productionEntries.createdBy, createdByUser.id))
    .leftJoin(checkedByUser, eq(productionEntries.checkedBy, checkedByUser.id))
    .where(sql`CAST(${productionEntries.sessionDate} AS CHAR) = ${dateStr}`)
    .orderBy(desc(productionEntries.insertedAt));

  return result.map(({ entry, createdByName, checkedByName }) => ({
    ...entry,
    createdByName: createdByName ?? null,
    checkedByName: checkedByName ?? null,
  }));
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

  const dateStr = toDateOnlyString(sessionDate);
  const result = await db
    .select()
    .from(productionDaySnapshots)
    .where(eq(productionDaySnapshots.sessionDate, dateStr as any))
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
  createdBy?: number | string
): Promise<ProductHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = crypto.randomUUID();
  const now = new Date();
  
  // Converter createdBy para number se for string
  const createdByNum = createdBy != null
    ? (typeof createdBy === 'string'
        ? (isNaN(parseInt(createdBy)) ? undefined : parseInt(createdBy))
        : createdBy)
    : undefined;
  // Garantir quantidade inteira (tabela armazena int)
  const qtyNumRaw = typeof quantity === 'number' ? quantity : Number((quantity as unknown as string) ?? 0);
  const qtyNum = Number.isFinite(qtyNumRaw) ? Math.round(qtyNumRaw) : 0;
  
  await db.insert(productHistory).values({
    id,
    productId,
    productCode,
    quantity: qtyNum,
    type,
    notes,
    createdBy: createdByNum,
    createdAt: now,
  });
  
  return { id, productId, productCode, quantity: qtyNum, type, notes: notes ?? null, createdBy: createdByNum ?? null, createdAt: now };
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
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  // Apenas snapshots finalizados
  return await db
    .select({
      date: productionDaySnapshots.sessionDate,
      totalItems: productionDaySnapshots.totalItems,
      totalQuantity: productionDaySnapshots.totalQuantity,
    })
    .from(productionDaySnapshots)
    .where(
      sql`${productionDaySnapshots.sessionDate} >= ${start} AND ${productionDaySnapshots.sessionDate} <= ${end} AND ${productionDaySnapshots.isOpen} = 0`
    )
    .orderBy(productionDaySnapshots.sessionDate);
}

export async function getTopProductsByQuantity(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const rows = await db
    .select({
      code: productionEntries.productCode,
      description: productionEntries.productDescription,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
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
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      totalQuantity: sql<number>`COALESCE(SUM(${productionEntries.quantity}), 0)`,
      totalItems: sql<number>`COALESCE(COUNT(${productionEntries.id}), 0)`,
      uniqueProducts: sql<number>`COALESCE(COUNT(DISTINCT ${productionEntries.productCode}), 0)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
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
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const rows = await db
    .select({
      date: sql<string>`DATE(${productionEntries.sessionDate})`,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
      totalItems: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
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

// Advanced Analytics Queries

// Taxa de Conferência
export async function getCheckRateStats(startDate: Date, endDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return { totalItems: 0, checkedItems: 0, checkRate: 0 };
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      totalItems: sql<number>`COUNT(*)`,
      checkedItems: sql<number>`SUM(CASE WHEN ${productionEntries.checked} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    );
  
  const data = result[0];
  const totalItems = Number(data?.totalItems ?? 0);
  const checkedItems = Number(data?.checkedItems ?? 0);
  const checkRate = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;
  
  return { totalItems, checkedItems, checkRate };
}

// Comparação com período anterior
export async function getPeriodComparison(startDate: Date, endDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - periodDays);
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  
  const currentStats = await getProductionStats(startDate, endDate);
  const previousStats = await getProductionStats(previousStart, previousEnd);
  
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  return {
    current: currentStats,
    previous: previousStats,
    changes: {
      totalQuantity: calcChange(currentStats.totalQuantity, previousStats.totalQuantity),
      totalItems: calcChange(currentStats.totalItems, previousStats.totalItems),
      uniqueProducts: calcChange(currentStats.uniqueProducts, previousStats.uniqueProducts),
      averagePerDay: calcChange(currentStats.averagePerDay, previousStats.averagePerDay),
    },
  };
}

// Dias produtivos
export async function getProductiveDays(startDate: Date, endDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return { productiveDays: 0, totalDays: 0, rate: 0 };
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      productiveDays: sql<number>`COUNT(DISTINCT ${productionEntries.sessionDate})`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    );
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const productiveDays = Number(result[0]?.productiveDays ?? 0);
  const rate = totalDays > 0 ? (productiveDays / totalDays) * 100 : 0;
  
  return { productiveDays, totalDays, rate };
}

// Análise ABC (Pareto)
export async function getABCAnalysis(startDate: Date, endDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const products = await db
    .select({
      code: productionEntries.productCode,
      description: productionEntries.productDescription,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    )
    .groupBy(productionEntries.productCode, productionEntries.productDescription)
    .orderBy(sql`SUM(${productionEntries.quantity}) DESC`);
  
  const total = products.reduce((sum, p) => sum + Number(p.totalQuantity ?? 0), 0);
  let accumulated = 0;
  
  return products.map((p) => {
    const quantity = Number(p.totalQuantity ?? 0);
    const percentage = total > 0 ? (quantity / total) * 100 : 0;
    accumulated += percentage;
    
    let classification = 'C';
    if (accumulated <= 80) classification = 'A';
    else if (accumulated <= 95) classification = 'B';
    
    return {
      code: p.code,
      description: p.description,
      totalQuantity: quantity,
      percentage,
      accumulated,
      classification,
    };
  });
}

// Produtos sem movimento
export async function getInactiveProducts(days: number = 30): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = toDateOnlyString(cutoffDate);
  
  // Produtos que nunca foram produzidos ou não foram produzidos recentemente
  const allProducts = await db.select().from(products);
  const recentProduction = await db
    .select({
      productCode: productionEntries.productCode,
      lastDate: sql<string>`MAX(${productionEntries.sessionDate})`,
    })
    .from(productionEntries)
    .where(sql`${productionEntries.sessionDate} >= ${cutoff}`)
    .groupBy(productionEntries.productCode);
  
  const recentCodes = new Set(recentProduction.map(p => p.productCode));
  
  return allProducts
    .filter(p => !recentCodes.has(p.code))
    .map(p => ({
      code: p.code,
      description: p.description,
      lastProducedAt: p.lastProducedAt,
      daysInactive: p.lastProducedAt 
        ? Math.floor((new Date().getTime() - new Date(p.lastProducedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
}

// Variabilidade de produção por produto
export async function getProductVariability(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      code: productionEntries.productCode,
      description: productionEntries.productDescription,
      avgQuantity: sql<number>`AVG(${productionEntries.quantity})`,
      stdDev: sql<number>`STDDEV(${productionEntries.quantity})`,
      minQuantity: sql<number>`MIN(${productionEntries.quantity})`,
      maxQuantity: sql<number>`MAX(${productionEntries.quantity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    )
    .groupBy(productionEntries.productCode, productionEntries.productDescription)
    .having(sql`COUNT(*) > 1`);
  
  return result.map((r) => ({
    code: r.code,
    description: r.description,
    avgQuantity: Number(r.avgQuantity ?? 0),
    stdDev: Number(r.stdDev ?? 0),
    minQuantity: Number(r.minQuantity ?? 0),
    maxQuantity: Number(r.maxQuantity ?? 0),
    count: Number(r.count ?? 0),
    coefficient: Number(r.avgQuantity ?? 0) > 0 ? (Number(r.stdDev ?? 0) / Number(r.avgQuantity ?? 0)) * 100 : 0,
  }));
}

// Alertas do sistema
export async function getSystemAlerts(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const alerts = [];
  
  // Dias não finalizados
  const { sql } = await import("drizzle-orm");
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const start = toDateOnlyString(last7Days);
  const today = toDateOnlyString(new Date());
  
  const unfinalizedDays = await db
    .select({
      sessionDate: productionEntries.sessionDate,
      totalItems: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} < ${today}`)
    .groupBy(productionEntries.sessionDate);
  
  const finalizedDates = await db
    .select({ sessionDate: productionDaySnapshots.sessionDate })
    .from(productionDaySnapshots)
    .where(sql`${productionDaySnapshots.sessionDate} >= ${start}`);
  
  const finalizedSet = new Set(finalizedDates.map(d => d.sessionDate.toString()));
  
  unfinalizedDays.forEach((day) => {
    if (!finalizedSet.has(day.sessionDate.toString())) {
      alerts.push({
        type: 'critical',
        category: 'finalization',
        message: `Dia ${formatDateLongPtBR(day.sessionDate)} não finalizado`,
        date: day.sessionDate,
        itemCount: Number(day.totalItems ?? 0),
      });
    }
  });
  
  // Produtos sem movimento recente
  
  
  // Taxa de conferência baixa
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const checkStats = await getCheckRateStats(last30Days, new Date());
  if (checkStats.checkRate < 80) {
    alerts.push({
      type: 'warning',
      category: 'check_rate',
      message: `Taxa de conferência baixa: ${checkStats.checkRate.toFixed(1)}%`,
      checkRate: checkStats.checkRate,
    });
  }
  
  return alerts;
}

// Heatmap semanal
export async function getWeeklyHeatmap(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      dayOfWeek: sql<number>`DAYOFWEEK(${productionEntries.sessionDate})`,
      hour: sql<number>`HOUR(${productionEntries.insertedAt})`,
      totalQuantity: sql<number>`SUM(${productionEntries.quantity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    )
    .groupBy(sql`DAYOFWEEK(${productionEntries.sessionDate})`, sql`HOUR(${productionEntries.insertedAt})`);
  
  return result.map((r) => ({
    dayOfWeek: Number(r.dayOfWeek ?? 0),
    hour: Number(r.hour ?? 0),
    totalQuantity: Number(r.totalQuantity ?? 0),
    count: Number(r.count ?? 0),
  }));
}

// Taxa de conferência por dia (sparkline)
export async function getCheckRateTrend(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  
  const result = await db
    .select({
      date: sql<string>`DATE(${productionEntries.sessionDate})`,
      totalItems: sql<number>`COUNT(*)`,
      checkedItems: sql<number>`SUM(CASE WHEN ${productionEntries.checked} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(productionEntries)
    .where(
      sql`${productionEntries.sessionDate} >= ${start} AND ${productionEntries.sessionDate} <= ${end}`
    )
    .groupBy(sql`DATE(${productionEntries.sessionDate})`);
  
  return result.map((r) => {
    const totalItems = Number(r.totalItems ?? 0);
    const checkedItems = Number(r.checkedItems ?? 0);
    return {
      date: r.date,
      totalItems,
      checkedItems,
      checkRate: totalItems > 0 ? (checkedItems / totalItems) * 100 : 0,
    };
  });
}

// Production Day Management Functions

// Verificar se pode finalizar o dia (após 16h)
export function canFinalizeDay(sessionDate: Date): { canFinalize: boolean; reason?: string } {
  const now = new Date();
  const session = new Date(sessionDate);
  
  // Normalizar datas para comparação
  session.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // Se é dia futuro, não pode finalizar
  if (session > today) {
    return { canFinalize: false, reason: 'Não é possível finalizar dias futuros' };
  }
  
  // Se é dia passado, pode finalizar
  if (session < today) {
    return { canFinalize: true };
  }
  
  return { canFinalize: true };
}

// Finalizar dia de produção
export async function finalizeProductionDay(
  sessionDate: Date,
  entries: any[],
  userId: number,
  userEmail: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se pode finalizar
  const validation = canFinalizeDay(sessionDate);
  if (!validation.canFinalize) {
    throw new Error(validation.reason);
  }
  
  const dateStr = toDateOnlyString(sessionDate);
  
  // Verificar se já existe snapshot
  const existing = await getSnapshotByDate(sessionDate);
  if (existing && !existing.isOpen) {
    throw new Error("Dia já finalizado. Solicite reabertura a um administrador.");
  }
  
  const id = crypto.randomUUID();
  const now = new Date();
  const enrichedEntries = await getProductionEntriesByDate(sessionDate);
  
  const snapshot = {
    id,
    sessionDate: dateStr as any,
    totalItems: entries.length,
    totalQuantity: entries.reduce((sum, e) => sum + e.quantity, 0),
    payloadJson: JSON.stringify(enrichedEntries),
    createdBy: userId,
    createdAt: now,
    finalizedAt: now,
    finalizedBy: userEmail,
    isOpen: false,
  };
  
  if (existing) {
    // Atualizar snapshot existente
    await db
      .update(productionDaySnapshots)
      .set(snapshot)
      .where(eq(productionDaySnapshots.sessionDate, dateStr as any));
  } else {
    // Criar novo snapshot
    await db.insert(productionDaySnapshots).values(snapshot);
  }
  
  // Registrar no histórico de produtos
  for (const entry of entries) {
    await addProductHistory(
      entry.productId || crypto.randomUUID(),
      entry.code,
      entry.quantity,
      'production',
      `Finalização do dia ${dateStr}`,
      userId
    );
  }
  
  return snapshot;
}

// Reabrir dia de produção (somente admin)
export async function reopenProductionDay(
  sessionDate: Date,
  adminId: number,
  adminEmail: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const dateStr = toDateOnlyString(sessionDate);
  
  // Buscar snapshot
  const snapshot = await getSnapshotByDate(sessionDate);
  if (!snapshot) {
    throw new Error("Dia não encontrado");
  }
  
  if (snapshot.isOpen) {
    throw new Error("Dia já está aberto");
  }
  
  const now = new Date();
  
  // Reabrir snapshot
  await db
    .update(productionDaySnapshots)
    .set({
      isOpen: true,
      reopenedAt: now,
      reopenedBy: adminEmail,
    })
    .where(eq(productionDaySnapshots.sessionDate, dateStr as any));
  
  // Restaurar entries do payload
  const entries = JSON.parse(snapshot.payloadJson as string);

  // Limpar entries antigas se existirem
  await db
    .delete(productionEntries)
    .where(eq(productionEntries.sessionDate, dateStr as any));

  // Recriar entries
  for (const entry of entries) {
    const productId = entry.productId ?? entry.product_id ?? crypto.randomUUID();
    const productCode = entry.productCode ?? entry.code ?? entry.product_code ?? "";
    const productDescription = entry.productDescription ?? entry.description ?? entry.product_description ?? "";
    const photoUrl = entry.photoUrl ?? entry.photo_url ?? null;
    const quantity = Number(entry.quantity ?? 0);
    const insertedAt = entry.insertedAt ?? entry.inserted_at ?? now;
    const createdBy = entry.createdBy ?? entry.created_by ?? adminId ?? null;
    const checkedBy = entry.checkedBy ?? entry.checked_by ?? null;
    const checkedAtRaw = entry.checkedAt ?? entry.checked_at ?? null;
    const checkedAt = checkedAtRaw ? new Date(checkedAtRaw) : null;

    if (!productCode) {
      throw new Error("Código do produto ausente no snapshot. Não foi possível reabrir o dia.");
    }

    await db.insert(productionEntries).values({
      id: crypto.randomUUID(),
      productId,
      productCode,
      productDescription,
      photoUrl,
      quantity,
      insertedAt: new Date(insertedAt),
      checked: !!entry.checked,
      sessionDate: dateStr as any,
      createdBy: createdBy ?? null,
      checkedBy: checkedBy ?? null,
      checkedAt,
    });
  }

  return { success: true, reopenedAt: now };
}

// Verificar status do dia
export async function getDayStatus(sessionDate: Date): Promise<any> {
  const db = await getDb();
  if (!db) return { isOpen: true, canFinalize: false };

  const snapshot = await getSnapshotByDate(sessionDate);
  const validation = canFinalizeDay(sessionDate);

  return {
    isOpen: snapshot ? snapshot.isOpen : true,
    canFinalize: validation.canFinalize,
    reason: validation.reason,
    snapshot: snapshot || null,
  };
}
