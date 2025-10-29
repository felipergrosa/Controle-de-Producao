import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, date, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Produtos - tabela de catálogo de produtos
 */
export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    code: varchar("code", { length: 100 }).notNull().unique(),
    description: text("description").notNull(),
    photoUrl: text("photo_url"),
    barcode: varchar("barcode", { length: 100 }),
    totalProduced: int("total_produced").default(0).notNull(),
    lastProducedAt: timestamp("last_produced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ([
    uniqueIndex("idx_products_code").on(table.code),
  ])
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Lançamentos de produção - cada linha representa um item lançado no dia
 */
export const productionEntries = mysqlTable(
  "production_entries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productCode: varchar("product_code", { length: 100 }).notNull(),
    productDescription: text("product_description").notNull(),
    photoUrl: text("photo_url"),
    quantity: int("quantity").notNull(),
    insertedAt: timestamp("inserted_at").defaultNow().notNull(),
    checked: boolean("checked").default(false).notNull(),
    sessionDate: date("session_date").notNull(),
    createdBy: int("created_by"),
  },
  (table) => ([
    uniqueIndex("idx_entries_session_product").on(table.sessionDate, table.productId),
  ])
);

export type ProductionEntry = typeof productionEntries.$inferSelect;
export type InsertProductionEntry = typeof productionEntries.$inferInsert;

/**
 * Snapshots de finalização de dia - registro do "Finalizar dia"
 */
export const productionDaySnapshots = mysqlTable(
  "production_day_snapshots",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionDate: date("session_date").notNull().unique(),
    totalItems: int("total_items").notNull(),
    totalQuantity: int("total_quantity").notNull(),
    finalizedAt: timestamp("finalized_at").defaultNow().notNull(),
    payloadJson: json("payload_json").notNull(),
    createdBy: int("created_by"),
  }
);

export type ProductionDaySnapshot = typeof productionDaySnapshots.$inferSelect;
export type InsertProductionDaySnapshot = typeof productionDaySnapshots.$inferInsert;

/**
 * Histórico de produção - rastreia todas as movimentações de produtos
 */
export const productHistory = mysqlTable(
  "product_history",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    productId: varchar("product_id", { length: 36 }).notNull(),
    productCode: varchar("product_code", { length: 100 }).notNull(),
    quantity: int("quantity").notNull(),
    type: mysqlEnum("type", ["production", "adjustment", "import"]).default("production").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: varchar("created_by", { length: 64 }),
  },
  (table) => ([
    uniqueIndex("idx_history_product").on(table.productId, table.createdAt),
  ])
);

export type ProductHistory = typeof productHistory.$inferSelect;
export type InsertProductHistory = typeof productHistory.$inferInsert;