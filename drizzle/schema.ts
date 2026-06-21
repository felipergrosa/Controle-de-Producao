import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, date, uniqueIndex, decimal, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Opcional para compat OAuth
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }), // bcrypt hash
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  defaultReaderMode: boolean("default_reader_mode").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessões de usuário - para autenticação local
 */
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    userId: int("user_id").notNull().references(() => users.id),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
  },
  (table) => ([
    uniqueIndex("idx_sessions_token").on(table.token),
  ])
);

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Logs de auditoria - rastreia todas as ações no sistema
 */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    userId: int("user_id").notNull().references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    entity: varchar("entity", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    entityCode: varchar("entity_code", { length: 100 }),
    details: json("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ([
    index("idx_audit_created").on(table.createdAt),
  ])
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

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
    pesoUnitarioG: decimal("peso_unitario_g", { precision: 10, scale: 3 }),
    diametroMm: decimal("diametro_mm", { precision: 10, scale: 3 }),
    espessuraMm: decimal("espessura_mm", { precision: 10, scale: 2 }),
    idealPecasHora: int("ideal_pecas_hora"),
    metaQuebraPct: decimal("meta_quebra_pct", { precision: 5, scale: 2 }),
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
    checkedBy: int("checked_by"),
    checkedAt: timestamp("checked_at"),
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
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: varchar("finalized_by", { length: 255 }),
    reopenedAt: timestamp("reopened_at"),
    reopenedBy: varchar("reopened_by", { length: 255 }),
    isOpen: boolean("is_open").default(true).notNull(),
    payloadJson: json("payload_json").notNull(),
    createdBy: int("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
    createdBy: int("created_by"), // Consistência: referência a users.id
  },
  (table) => ([
    index("idx_history_product").on(table.productId, table.createdAt),
  ])
);

export type ProductHistory = typeof productHistory.$inferSelect;
export type InsertProductHistory = typeof productHistory.$inferInsert;

/**
 * Repuxadores - Operadores da máquina de repuxo
 */
export const repuxadores = mysqlTable("repuxadores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  matricula: varchar("matricula", { length: 50 }),
  turnoPadrao: varchar("turno_padrao", { length: 20 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Repuxador = typeof repuxadores.$inferSelect;
export type InsertRepuxador = typeof repuxadores.$inferInsert;

/**
 * Causas de quebra - Motivos padronizados de quebra
 */
export const causasQuebra = mysqlTable("causas_quebra", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CausaQuebra = typeof causasQuebra.$inferSelect;
export type InsertCausaQuebra = typeof causasQuebra.$inferInsert;

/**
 * Lançamento de produção de repuxados
 */
export const producaoRepuxados = mysqlTable("producao_repuxados", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  productId: varchar("product_id", { length: 36 }).notNull(),
  repuxadorId: int("repuxador_id").notNull(),
  dataProducao: date("data_producao").notNull(),
  turno: varchar("turno", { length: 20 }).notNull(),
  horaInicio: varchar("hora_inicio", { length: 8 }).notNull(), // formato HH:MM:SS ou HH:MM
  horaFim: varchar("hora_fim", { length: 8 }).notNull(),
  pecasProduzidas: int("pecas_produzidas").notNull(),
  pecasQuebradas: int("pecas_quebradas").default(0).notNull(),
  causaQuebraId: int("causa_quebra_id"),
  obs: text("obs"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProducaoRepuxado = typeof producaoRepuxados.$inferSelect;
export type InsertProducaoRepuxado = typeof producaoRepuxados.$inferInsert;

/**
 * Paradas de máquina associadas aos repuxados
 */
export const paradasMaquina = mysqlTable("paradas_maquina", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  producaoRepuxadosId: varchar("producao_repuxados_id", { length: 36 }).notNull(),
  tempoMinutos: int("tempo_minutos").notNull(),
  motivo: varchar("motivo", { length: 255 }),
  causaQuebraId: int("causa_quebra_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ParadaMaquina = typeof paradasMaquina.$inferSelect;
export type InsertParadaMaquina = typeof paradasMaquina.$inferInsert;

/**
 * Metas configuráveis de repuxo
 */
export const metasRepuxo = mysqlTable("metas_repuxo", {
  id: int("id").autoincrement().primaryKey(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'geral', 'repuxador', 'produto'
  referenciaId: varchar("referencia_id", { length: 36 }), // id do produto ou repuxador
  metaKgDia: decimal("meta_kg_dia", { precision: 10, scale: 2 }).notNull(),
  metaQuebraPct: decimal("meta_quebra_pct", { precision: 5, scale: 2 }).notNull(),
  vigenciaInicio: date("vigencia_inicio").notNull(),
  vigenciaFim: date("vigencia_fim"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MetaRepuxo = typeof metasRepuxo.$inferSelect;
export type InsertMetaRepuxo = typeof metasRepuxo.$inferInsert;

/**
 * Tabela interna de controle de migrações
 */
export const migrationsTable = mysqlTable("_migrations", {
  id: int("id").autoincrement().primaryKey(),
  version: int("version").notNull().unique(),
  filename: varchar("filename", { length: 255 }).notNull(),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_version").on(table.version),
]);