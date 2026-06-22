import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "../server/db";
import { 
  repuxadores, 
  causasQuebra, 
  motivosParada, 
  products, 
  producaoRepuxados, 
  paradasMaquina 
} from "../drizzle/schema";

async function main() {
  console.log("=== SCRIPT DE EXPORTAÇÃO DE BACKUP DE REPUXADOS ===");
  const db = await getDb();
  if (!db) {
    console.error("Erro ao conectar no banco de dados.");
    process.exit(1);
  }

  // 1. Carregar tabelas de lookup
  console.log("Lendo repuxadores...");
  const repuxadoresData = await db.select().from(repuxadores);

  console.log("Lendo causas de quebra...");
  const causasQuebraData = await db.select().from(causasQuebra);

  console.log("Lendo motivos de parada...");
  const motivosParadaData = await db.select().from(motivosParada);

  // 2. Carregar produtos (apenas de repuxado - código não numérico)
  console.log("Lendo produtos...");
  const allProducts = await db.select().from(products);
  const productsData = allProducts.filter(p => !/^\d+$/.test(p.code));

  // 3. Carregar lançamentos de produção
  console.log("Lendo lançamentos de produção de repuxados...");
  const producaoData = await db.select().from(producaoRepuxados);

  // 4. Carregar paradas de máquina
  console.log("Lendo paradas de máquina...");
  const paradasData = await db.select().from(paradasMaquina);

  // Montar objeto de backup
  const dateStr = new Date().toISOString().split("T")[0];
  const backupFilename = `repuxados-backup-${dateStr}.json`;
  const backupPath = path.resolve(backupFilename);

  const backupPayload = {
    exportDate: new Date().toISOString(),
    sourceDatabase: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "desconhecido",
    repuxadores: repuxadoresData,
    causasQuebra: causasQuebraData,
    motivosParada: motivosParadaData,
    products: productsData,
    producaoRepuxados: producaoData,
    paradasMaquina: paradasData,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), "utf-8");

  console.log(`\nBackup exportado com sucesso para: ${backupFilename}`);
  console.log(`- Repuxadores: ${repuxadoresData.length}`);
  console.log(`- Causas de Quebra: ${causasQuebraData.length}`);
  console.log(`- Motivos de Parada: ${motivosParadaData.length}`);
  console.log(`- Produtos de Repuxo: ${productsData.length} (de um total de ${allProducts.length})`);
  console.log(`- Lançamentos de Produção: ${producaoData.length}`);
  console.log(`- Paradas de Máquina: ${paradasData.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro durante a exportação:", err);
  process.exit(1);
});
