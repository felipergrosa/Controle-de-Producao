import { readdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { getDb } from "./db";

interface Migration {
  filename: string;
  version: number;
  sql: string;
}

/**
 * Cria tabela de controle de migrations se não existir
 */
async function ensureMigrationsTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version INT NOT NULL UNIQUE,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Busca migrations já executadas
 */
async function getExecutedMigrations(connection: mysql.Connection): Promise<number[]> {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT version FROM _migrations ORDER BY version ASC"
  );
  return rows.map((r) => r.version);
}

/**
 * Lê arquivos de migration da pasta migrations/
 */
async function readMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  
  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Ordena alfabeticamente

    const migrations: Migration[] = [];

    for (const filename of sqlFiles) {
      // Extrai versão do nome do arquivo (ex: 001_auth.sql -> 1)
      const match = filename.match(/^(\d+)_/);
      if (!match) {
        console.warn(`[Migrations] Ignorando arquivo sem versão: ${filename}`);
        continue;
      }

      const version = parseInt(match[1], 10);
      const filepath = join(migrationsDir, filename);
      const sql = await readFile(filepath, "utf-8");

      migrations.push({ filename, version, sql });
    }

    return migrations.sort((a, b) => a.version - b.version);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("[Migrations] Pasta migrations/ não encontrada, pulando...");
      return [];
    }
    throw error;
  }
}

/**
 * Executa uma migration
 */
async function executeMigration(
  connection: mysql.Connection,
  migration: Migration
): Promise<void> {
  console.log(`[Migrations] Executando: ${migration.filename}...`);

  // Dividir SQL em statements (separados por ; seguido de newline)
  const statements = migration.sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--")); // Remove comentários

  for (const statement of statements) {
    if (statement.length > 0) {
      await connection.execute(statement);
    }
  }

  // Registrar migration como executada
  await connection.execute(
    "INSERT INTO _migrations (version, filename) VALUES (?, ?)",
    [migration.version, migration.filename]
  );

  console.log(`[Migrations] ✓ ${migration.filename} executada com sucesso`);
}

/**
 * Executa todas as migrations pendentes
 */
export async function runMigrations(): Promise<void> {
  console.log("[Migrations] Verificando migrations...");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[Migrations] DATABASE_URL não configurado, pulando migrations");
    return;
  }

  let connection: mysql.Connection | null = null;

  try {
    // Criar conexão direta (não usa Drizzle)
    connection = await mysql.createConnection(connectionString);

    // Garantir que tabela de controle existe
    await ensureMigrationsTable(connection);

    // Buscar migrations já executadas
    const executedVersions = await getExecutedMigrations(connection);
    console.log(`[Migrations] Migrations já executadas: [${executedVersions.join(", ")}]`);

    // Ler arquivos de migration
    const allMigrations = await readMigrationFiles();
    console.log(`[Migrations] Total de migrations encontradas: ${allMigrations.length}`);

    // Filtrar migrations pendentes
    const pendingMigrations = allMigrations.filter(
      (m) => !executedVersions.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log("[Migrations] ✓ Nenhuma migration pendente");
      return;
    }

    console.log(`[Migrations] Migrations pendentes: ${pendingMigrations.length}`);

    // Executar cada migration pendente
    for (const migration of pendingMigrations) {
      await executeMigration(connection, migration);
    }

    console.log(`[Migrations] ✓ Todas as migrations foram executadas com sucesso`);
  } catch (error) {
    console.error("[Migrations] Erro ao executar migrations:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Lista status das migrations
 */
export async function listMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("DATABASE_URL não configurado");
    return;
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(connectionString);
    await ensureMigrationsTable(connection);

    const executedVersions = await getExecutedMigrations(connection);
    const allMigrations = await readMigrationFiles();

    console.log("\n=== Status das Migrations ===\n");
    console.log(`Total: ${allMigrations.length}`);
    console.log(`Executadas: ${executedVersions.length}`);
    console.log(`Pendentes: ${allMigrations.length - executedVersions.length}\n`);

    for (const migration of allMigrations) {
      const status = executedVersions.includes(migration.version) ? "✓" : "✗";
      console.log(`${status} [${migration.version}] ${migration.filename}`);
    }
    console.log();
  } catch (error) {
    console.error("Erro:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
