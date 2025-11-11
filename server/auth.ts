import bcrypt from "bcryptjs";
import crypto from "crypto";
import { and, desc, eq, gte, lte, lt, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, sessions, auditLogs, InsertUser, User, Session, InsertAuditLog } from "../drizzle/schema";
import { getBrazilTimestamp } from "./_core/time";

const BCRYPT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 365;
const SESSION_MAX_AGE_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Cria hash de senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifica se senha corresponde ao hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Gera token de sessão seguro
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Cria usuário local
 */
export async function createLocalUser(
  email: string,
  password: string,
  name?: string,
  role: "user" | "admin" = "user",
  defaultReaderMode = false
): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se email já existe
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error("Email já cadastrado");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const insertData: InsertUser = {
    email,
    passwordHash,
    name: name ?? null,
    role,
    loginMethod: "local",
    isActive: true,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    defaultReaderMode,
  };

  const result = await db.insert(users).values(insertData);
  const userId = result[0].insertId;

  const newUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return newUser[0];
}

/**
 * Autentica usuário e cria sessão
 */
export { SESSION_MAX_AGE_MS };

export async function loginLocal(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: User; session: Session }> {
  const timestamp = getBrazilTimestamp();
  console.info(`[Auth][${timestamp}] Login attempt`, { email, ipAddress, userAgent });
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar usuário
  let userResult: User[] = [];
  try {
    userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
  } catch (error) {
    console.error(`[Auth][${timestamp}] Failed to query user`, { email, error });
    throw error;
  }
  if (userResult.length === 0) {
    throw new Error("Email ou senha inválidos");
  }

  const user = userResult[0];

  // Verificar se está ativo
  if (!user.isActive) {
    throw new Error("Usuário desativado");
  }

  // Verificar senha
  if (!user.passwordHash) {
    throw new Error("Usuário não tem senha configurada");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new Error("Email ou senha inválidos");
  }

  // Atualizar lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  // Criar sessão
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  const sessionId = crypto.randomUUID();
  try {
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
  } catch (error) {
    console.error(`[Auth][${getBrazilTimestamp()}] Failed to create session`, { userId: user.id, error });
    throw error;
  }

  const newSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  console.info(`[Auth][${getBrazilTimestamp()}] Login successful`, { userId: user.id, sessionId });

  return { user, session: newSession[0] };
}

/**
 * Valida token de sessão e retorna usuário
 */
export async function validateSession(token: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();

  // Buscar sessão válida
  const sessionResult = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (sessionResult.length === 0) {
    return null;
  }

  const session = sessionResult[0];

  if (session.expiresAt && session.expiresAt.getTime() <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  if (
    session.expiresAt &&
    session.expiresAt.getTime() - now.getTime() < SESSION_RENEW_THRESHOLD_MS
  ) {
    const newExpiry = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await db
      .update(sessions)
      .set({ expiresAt: newExpiry })
      .where(eq(sessions.id, session.id));
  }

  // Buscar usuário
  const userResult = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

  if (userResult.length === 0 || !userResult[0].isActive) {
    return null;
  }

  return userResult[0];
}

/**
 * Invalida sessão (logout)
 */
export async function logout(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(sessions).where(eq(sessions.token, token));
}

/**
 * Limpa sessões expiradas
 */
export async function cleanExpiredSessions(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const allSessions = await db.select().from(sessions);
  const expiredIds = allSessions.filter(s => s.expiresAt < now).map(s => s.id);
  
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      await db.delete(sessions).where(eq(sessions.id, id));
    }
  }
}

/**
 * Atualiza senha do usuário
 */
export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, userId));
}

/**
 * Desativa/ativa usuário
 */
export async function toggleUserActive(userId: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

/**
 * Lista todos os usuários
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

/**
 * Busca usuário por ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Atualiza dados do usuário
 */
export async function updateUser(
  userId: number, 
  data: { name?: string; email?: string; role?: 'user' | 'admin'; defaultReaderMode?: boolean }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.defaultReaderMode !== undefined) updateData.defaultReaderMode = data.defaultReaderMode;

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

/**
 * Deleta usuário
 */
export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Registra log de auditoria
 */
export async function logAudit(
  userId: number,
  action: string,
  entity: string,
  entityId?: string,
  entityCode?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const normalizedDetails = normalizeAuditDetails(action, entity, entityCode, details);

  const db = await getDb();
  if (!db) return;

  const logData: InsertAuditLog = {
    userId,
    action,
    entity,
    entityId: entityId ?? null,
    entityCode: entityCode ?? null,
    details: normalizedDetails ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  };

  await db.insert(auditLogs).values(logData);
}

function normalizeAuditDetails(
  action: string,
  entity: string,
  entityCode?: string,
  details?: Record<string, any>
): Record<string, any> | null {
  const baseDetails = details ? { ...details } : {};
  if (entityCode && baseDetails.entityCode === undefined) {
    baseDetails.entityCode = entityCode;
  }

  return buildDefaultDetails(action, entity, entityCode, baseDetails);
}

function buildDefaultDetails(
  action: string,
  entity: string,
  entityCode: string | undefined,
  details: Record<string, any>
): Record<string, any> | null {
  const base = { ...(details ?? {}) } as Record<string, any>;

  const existingMessage = typeof base.message === "string" ? base.message.trim() : "";
  const existingAction = base.action ? String(base.action) : null;

  if (!existingMessage) {
    base.message = defaultAuditMessage(action, entity, entityCode, base);
  }

  if (!existingAction) {
    base.action = defaultActionKey(action, entity, base);
  }

  return Object.keys(base).length > 0 ? base : null;
}

function defaultAuditMessage(
  action: string,
  entity: string,
  entityCode: string | undefined,
  details: Record<string, any>
): string {
  switch (`${entity}:${action}`) {
    case "user:login":
      return "Usuário realizou login";
    case "user:create":
      return `Usuário criado${details.email ? ` (${details.email})` : ""}`;
    case "user:update":
      if (details.action === "password_reset") {
        return "Senha do usuário redefinida";
      }
      if (details.action === "activated") {
        return "Usuário ativado";
      }
      if (details.action === "deactivated") {
        return "Usuário desativado";
      }
      return `Usuário atualizado${details.email ? ` (${details.email})` : ""}`;
    case "user:delete":
      return `Usuário removido${details.email ? ` (${details.email})` : ""}`;
    case "production_entry:create": {
      const quantityText = details.quantity !== undefined ? ` (Qtd: ${details.quantity})` : "";
      return `Lançamento criado: ${formatProductLabel(details, entityCode)}${quantityText}`;
    }
    case "production_entry:update": {
      const changeParts: string[] = [];
      if (details.quantity !== undefined) {
        changeParts.push(`quantidade: ${details.quantity}`);
      }
      if (typeof details.checked === "boolean") {
        changeParts.push(`conferido: ${details.checked ? "Sim" : "Não"}`);
      }
      const suffix = changeParts.length ? ` (${changeParts.join(", ")})` : "";
      return `Lançamento atualizado: ${formatProductLabel(details, entityCode)}${suffix}`;
    }
    case "production_entry:delete":
      return `Lançamento removido: ${formatProductLabel(details, entityCode)}${details.quantity !== undefined ? ` (Qtd: ${details.quantity})` : ""}`;
    case "production_day:finalize":
      return `Dia ${formatDateLabel(details.sessionDate ?? entityCode)} finalizado`;
    case "production_day:reopen":
      return `Dia ${formatDateLabel(details.sessionDate ?? entityCode)} reaberto`;
    default:
      return `${entity.replace(/_/g, " ")} ${translateAction(action)}`.trim();
  }
}

function defaultActionKey(action: string, entity: string, details: Record<string, any>): string {
  switch (`${entity}:${action}`) {
    case "user:login":
      return "login";
    case "user:create":
      return "created";
    case "user:delete":
      return "deleted";
    case "user:update":
      if (details.action === "password_reset") return "password_reset";
      if (details.action === "activated" || details.action === "deactivated") return details.action;
      return "updated";
    case "production_entry:create":
      return "entry_created";
    case "production_entry:update":
      if (typeof details.checked === "boolean") {
        return details.checked ? "entry_checked" : "entry_unchecked";
      }
      if (details.quantity !== undefined) {
        return "entry_quantity_updated";
      }
      return "entry_updated";
    case "production_entry:delete":
      return "entry_deleted";
    case "production_day:finalize":
      return "day_finalized";
    case "production_day:reopen":
      return "day_reopened";
    default:
      return `${entity}_${action}`;
  }
}

function translateAction(action: string): string {
  switch (action) {
    case "create":
      return "criado";
    case "update":
      return "atualizado";
    case "delete":
      return "removido";
    case "finalize":
      return "finalizado";
    case "reopen":
      return "reaberto";
    case "login":
      return "login";
    default:
      return action;
  }
}

function formatProductLabel(details: Record<string, any>, entityCode: string | undefined): string {
  const code = details.productCode ?? details.code ?? entityCode ?? "-";
  const description = details.productDescription ?? details.description ?? details.productName;
  if (code && description) {
    return `${code} - ${description}`;
  }
  return code || description || "lançamento";
}

function formatDateLabel(value: any): string {
  if (!value) {
    return "(data não informada)";
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "string") {
    return value.split("T")[0];
  }
  return String(value);
}

/**
 * Busca logs de auditoria com filtros
 */
export type AuditLogsCursor = {
  createdAt: Date;
  id: string;
};

export type AuditLogsFilters = {
  action?: string;
  entity?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: AuditLogsCursor;
};

export type AuditLogsResult = {
  items: any[];
  nextCursor: { createdAt: string; id: string } | null;
};

export async function getAuditLogs(filters?: AuditLogsFilters): Promise<AuditLogsResult> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };

  const pageSize = Math.min(Math.max(filters?.limit ?? 20, 1), 200);

  const baseQuery = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      entityCode: auditLogs.entityCode,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));

  const conditions: any[] = [];

  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  if (filters?.entity) {
    conditions.push(eq(auditLogs.entity, filters.entity));
  }

  if (filters?.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }

  if (filters?.search) {
    const normalized = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${users.name}) LIKE ${normalized} OR LOWER(${users.email}) LIKE ${normalized} OR LOWER(${auditLogs.entityCode}) LIKE ${normalized})`
    );
  }

  if (filters?.cursor) {
    conditions.push(
      or(
        lt(auditLogs.createdAt, filters.cursor.createdAt),
        and(eq(auditLogs.createdAt, filters.cursor.createdAt), lt(auditLogs.id, filters.cursor.id))
      )
    );
  }

  const filteredQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  const rows = await filteredQuery
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(pageSize + 1);

  const items = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const nextCursor = hasMore
    ? {
        createdAt: items[items.length - 1].createdAt.toISOString(),
        id: items[items.length - 1].id,
      }
    : null;

  return { items, nextCursor };
}
