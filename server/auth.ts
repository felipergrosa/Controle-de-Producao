import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./db";
import { users, sessions, auditLogs, InsertUser, User, Session, InsertAuditLog } from "../drizzle/schema";

const BCRYPT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 30;

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
  role: "user" | "admin" = "user"
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
  };

  const result = await db.insert(users).values(insertData);
  const userId = result[0].insertId;

  const newUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return newUser[0];
}

/**
 * Autentica usuário e cria sessão
 */
export async function loginLocal(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: User; session: Session }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar usuário
  const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const sessionId = crypto.randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    token,
    expiresAt,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  const newSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

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
  const db = await getDb();
  if (!db) return;

  const logData: InsertAuditLog = {
    userId,
    action,
    entity,
    entityId: entityId ?? null,
    entityCode: entityCode ?? null,
    details: details ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  };

  await db.insert(auditLogs).values(logData);
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
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

  // Aplicar filtros (simplificado - em produção usar where conditions)
  const result = await query.limit(filters?.limit ?? 100);
  
  return result;
}
