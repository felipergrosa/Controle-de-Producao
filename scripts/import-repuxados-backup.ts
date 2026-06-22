import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { getDb } from "../server/db";
import { 
  repuxadores, 
  causasQuebra, 
  motivosParada, 
  products, 
  producaoRepuxados, 
  paradasMaquina 
} from "../drizzle/schema";

function formatDateOnly(dateVal: any): string {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split("T")[0];
  }
  const str = String(dateVal);
  return str.split("T")[0];
}

async function main() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");
  
  // Filtrar o nome do arquivo que não seja o flag --commit
  const fileArg = args.find(a => !a.startsWith("--"));

  console.log("=== SCRIPT DE IMPORTAÇÃO DE BACKUP DE REPUXADOS ===");
  if (isCommit) {
    console.log(" MODO: GRAVAÇÃO ATIVA (--commit)");
  } else {
    console.log(" MODO: SIMULAÇÃO / TESTE (--dry-run). Nenhuma gravação ocorrerá no banco.");
    console.log(" Dica: Para gravar de verdade, adicione o flag: --commit");
  }

  let filePath = "";
  if (fileArg) {
    filePath = path.resolve(fileArg);
  } else {
    // Tentar encontrar o mais recente na raiz
    const files = fs.readdirSync(path.resolve(".")).filter(f => f.startsWith("repuxados-backup-") && f.endsWith(".json"));
    if (files.length === 0) {
      console.error("Erro: Nenhum arquivo de backup encontrado e nenhum argumento informado.");
      console.log("Exemplo de uso: npx tsx scripts/import-repuxados-backup.ts repuxados-backup-YYYY-MM-DD.json");
      process.exit(1);
    }
    files.sort().reverse(); // Mais recente primeiro
    filePath = path.resolve(files[0]);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo '${filePath}' não encontrado.`);
    process.exit(1);
  }

  console.log(`Lendo dados do arquivo: ${path.basename(filePath)}...`);
  const backupData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const db = await getDb();
  if (!db) {
    console.error("Erro: Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  // 1. MAPEAMENTO DE REPUXADORES
  console.log("\n[Lookup 1/3] Processando repuxadores...");
  const dbReps = await db.select().from(repuxadores);
  const repMapProd = new Map<string, number>(); // nomeUpper -> idProd
  dbReps.forEach(r => repMapProd.set(r.nome.toUpperCase(), r.id));

  const mapRepIdDevToProd = new Map<number, number>(); // idDev -> idProd
  let repuxadoresInseridos = 0;

  for (const repDev of backupData.repuxadores || []) {
    const nomeUpper = repDev.nome.toUpperCase();
    if (repMapProd.has(nomeUpper)) {
      const idProd = repMapProd.get(nomeUpper)!;
      mapRepIdDevToProd.set(repDev.id, idProd);
    } else {
      if (isCommit) {
        const [r] = await db.insert(repuxadores).values({
          nome: repDev.nome,
          matricula: repDev.matricula || null,
          turnoPadrao: repDev.turnoPadrao || "Turno A",
          ativo: repDev.ativo ?? true
        });
        const newId = (r as any).insertId;
        repMapProd.set(nomeUpper, newId);
        mapRepIdDevToProd.set(repDev.id, newId);
        console.log(`  + Operador criado em prod: ${repDev.nome} (ID: ${newId})`);
      } else {
        const fakeId = 9000 + repDev.id;
        mapRepIdDevToProd.set(repDev.id, fakeId);
        console.log(`  [Simulação] + Operador seria criado: ${repDev.nome} (ID simulado: ${fakeId})`);
      }
      repuxadoresInseridos++;
    }
  }

  // 2. MAPEAMENTO DE CAUSAS DE QUEBRA
  console.log("\n[Lookup 2/3] Processando causas de quebra...");
  const dbCausas = await db.select().from(causasQuebra);
  const causaMapProd = new Map<string, number>(); // descricaoUpper -> idProd
  dbCausas.forEach(c => causaMapProd.set(c.descricao.toUpperCase(), c.id));

  const mapCausaIdDevToProd = new Map<number, number>(); // idDev -> idProd
  let causasInseridas = 0;

  for (const causaDev of backupData.causasQuebra || []) {
    const descUpper = causaDev.descricao.toUpperCase();
    if (causaMapProd.has(descUpper)) {
      const idProd = causaMapProd.get(descUpper)!;
      mapCausaIdDevToProd.set(causaDev.id, idProd);
    } else {
      if (isCommit) {
        const [r] = await db.insert(causasQuebra).values({
          descricao: causaDev.descricao,
          ativo: causaDev.ativo ?? true
        });
        const newId = (r as any).insertId;
        causaMapProd.set(descUpper, newId);
        mapCausaIdDevToProd.set(causaDev.id, newId);
        console.log(`  + Causa de quebra criada em prod: ${causaDev.descricao} (ID: ${newId})`);
      } else {
        const fakeId = 8000 + causaDev.id;
        mapCausaIdDevToProd.set(causaDev.id, fakeId);
        console.log(`  [Simulação] + Causa seria criada: ${causaDev.descricao} (ID simulado: ${fakeId})`);
      }
      causasInseridas++;
    }
  }

  // 3. MAPEAMENTO DE MOTIVOS DE PARADA
  console.log("\n[Lookup 3/3] Processando motivos de parada...");
  const dbMotivos = await db.select().from(motivosParada);
  const motivoMapProd = new Map<string, number>(); // descricaoUpper -> idProd
  dbMotivos.forEach(m => motivoMapProd.set(m.descricao.toUpperCase(), m.id));

  const mapMotivoIdDevToProd = new Map<number, number>(); // idDev -> idProd
  let motivosInseridos = 0;

  for (const motivoDev of backupData.motivosParada || []) {
    const descUpper = motivoDev.descricao.toUpperCase();
    if (motivoMapProd.has(descUpper)) {
      const idProd = motivoMapProd.get(descUpper)!;
      mapMotivoIdDevToProd.set(motivoDev.id, idProd);
    } else {
      if (isCommit) {
        const [r] = await db.insert(motivosParada).values({
          descricao: motivoDev.descricao,
          ativo: motivoDev.ativo ?? true
        });
        const newId = (r as any).insertId;
        motivoMapProd.set(descUpper, newId);
        mapMotivoIdDevToProd.set(motivoDev.id, newId);
        console.log(`  + Motivo de parada criado em prod: ${motivoDev.descricao} (ID: ${newId})`);
      } else {
        const fakeId = 7000 + motivoDev.id;
        mapMotivoIdDevToProd.set(motivoDev.id, fakeId);
        console.log(`  [Simulação] + Motivo seria criado: ${motivoDev.descricao} (ID simulado: ${fakeId})`);
      }
      motivosInseridos++;
    }
  }

  // 4. PROCESSAR PRODUTOS (Catálogo)
  console.log("\n[Passo 1/3] Processando catálogo de produtos...");
  const dbProducts = await db.select().from(products);
  const productMapProd = new Set<string>(); // codeUpper
  dbProducts.forEach(p => productMapProd.add(p.code.toUpperCase()));

  let produtosInseridos = 0;

  for (const prodDev of backupData.products || []) {
    const codeUpper = prodDev.code.toUpperCase();
    if (!productMapProd.has(codeUpper)) {
      if (isCommit) {
        await db.insert(products).values({
          id: prodDev.id,
          code: prodDev.code,
          description: prodDev.description,
          photoUrl: prodDev.photoUrl || null,
          barcode: prodDev.barcode || null,
          pesoUnitarioG: prodDev.pesoUnitarioG || "0.000",
          diametroMm: prodDev.diametroMm || "0.000",
          espessuraMm: prodDev.espessuraMm || "0.00",
          idealPecasHora: prodDev.idealPecasHora || null,
          metaQuebraPct: prodDev.metaQuebraPct || null
        });
        console.log(`  + Produto criado em prod: ${prodDev.code} - ${prodDev.description}`);
      } else {
        console.log(`  [Simulação] + Produto seria criado: ${prodDev.code} - ${prodDev.description}`);
      }
      productMapProd.add(codeUpper);
      produtosInseridos++;
    }
  }

  // 5. PROCESSAR PRODUÇÃO DE REPUXADOS
  console.log("\n[Passo 2/3] Processando lançamentos de produção...");
  const dbProducao = await db.select().from(producaoRepuxados);
  
  // Mapear produções existentes em prod: `${dataProducao}|${productId}|${repuxadorId}|${horaInicio.slice(0,5)}` -> idProd
  const producaoMapProd = new Map<string, string>();
  dbProducao.forEach(p => {
    const key = `${formatDateOnly(p.dataProducao)}|${p.productId}|${p.repuxadorId}|${p.horaInicio.slice(0, 5)}`;
    producaoMapProd.set(key, p.id);
  });

  const mapProducaoIdDevToProd = new Map<string, string>(); // idDev -> idProd
  let producoesInseridas = 0;
  let producoesDuplicadas = 0;

  for (const prodDev of backupData.producaoRepuxados || []) {
    const repProdId = mapRepIdDevToProd.get(prodDev.repuxadorId);
    if (!repProdId) {
      console.warn(`  [Aviso] Ignorando produção ${prodDev.id} devido a operador inválido (ID Dev: ${prodDev.repuxadorId})`);
      continue;
    }

    const causaProdId = prodDev.causaQuebraId ? mapCausaIdDevToProd.get(prodDev.causaQuebraId) : null;
    const dataStr = formatDateOnly(prodDev.dataProducao);
    const dedupeKey = `${dataStr}|${prodDev.productId}|${repProdId}|${prodDev.horaInicio.slice(0, 5)}`;

    if (producaoMapProd.has(dedupeKey)) {
      const idProd = producaoMapProd.get(dedupeKey)!;
      mapProducaoIdDevToProd.set(prodDev.id, idProd);
      producoesDuplicadas++;
    } else {
      const newUuid = prodDev.id; // Mantém o mesmo UUID do dev
      if (isCommit) {
        await db.insert(producaoRepuxados).values({
          id: newUuid,
          productId: prodDev.productId,
          repuxadorId: repProdId,
          dataProducao: dataStr,
          turno: prodDev.turno,
          horaInicio: prodDev.horaInicio,
          horaFim: prodDev.horaFim,
          pecasProduzidas: prodDev.pecasProduzidas,
          pecasQuebradas: prodDev.pecasQuebradas,
          causaQuebraId: causaProdId || null,
          obs: prodDev.obs || null,
          createdBy: prodDev.createdBy || 1
        });
      }
      mapProducaoIdDevToProd.set(prodDev.id, newUuid);
      // Evitar duplicatas internas no mesmo import
      producaoMapProd.set(dedupeKey, newUuid);
      producoesInseridas++;
    }
  }

  // 6. PROCESSAR PARADAS DE MÁQUINA
  console.log("\n[Passo 3/3] Processando paradas de máquina...");
  const dbParadas = await db.select().from(paradasMaquina);
  
  // Set de chaves únicas em prod: `${producaoRepuxadosId}|${tempoMinutos}|${motivoParadaId}`
  const paradasMapProd = new Set<string>();
  dbParadas.forEach(p => {
    paradasMapProd.add(`${p.producaoRepuxadosId}|${p.tempoMinutos}|${p.motivoParadaId}`);
  });

  let paradasInseridas = 0;
  let paradasDuplicadas = 0;
  let paradasOrfas = 0;

  for (const paradaDev of backupData.paradasMaquina || []) {
    const prodProdId = mapProducaoIdDevToProd.get(paradaDev.producaoRepuxadosId);
    if (!prodProdId) {
      paradasOrfas++;
      continue;
    }

    const motParadaProdId = paradaDev.motivoParadaId ? mapMotivoIdDevToProd.get(paradaDev.motivoParadaId) : null;
    const causaProdId = paradaDev.causaQuebraId ? mapCausaIdDevToProd.get(paradaDev.causaQuebraId) : null;

    const dedupeKey = `${prodProdId}|${paradaDev.tempoMinutos}|${motParadaProdId}`;

    if (paradasMapProd.has(dedupeKey)) {
      paradasDuplicadas++;
    } else {
      if (isCommit) {
        await db.insert(paradasMaquina).values({
          id: crypto.randomUUID(),
          producaoRepuxadosId: prodProdId,
          tempoMinutos: paradaDev.tempoMinutos,
          motivo: paradaDev.motivo || null,
          motivoParadaId: motParadaProdId || null,
          causaQuebraId: causaProdId || null
        });
      }
      paradasMapProd.add(dedupeKey);
      paradasInseridas++;
    }
  }

  console.log("\n=== RELATÓRIO FINAL DA IMPORTAÇÃO ===");
  console.log(`Operação: ${isCommit ? "GRAVAÇÃO EFETUADA" : "SIMULAÇÃO APENAS (Dry-Run)"}`);
  console.log(`- Repuxadores: ${repuxadoresInseridos} criados (mapeados: ${backupData.repuxadores?.length || 0})`);
  console.log(`- Causas de Quebra: ${causasInseridas} criadas (mapeados: ${backupData.causasQuebra?.length || 0})`);
  console.log(`- Motivos de Parada: ${motivosInseridos} criados (mapeados: ${backupData.motivosParada?.length || 0})`);
  console.log(`- Produtos: ${produtosInseridos} inseridos (mapeados: ${backupData.products?.length || 0})`);
  console.log(`- Produções: ${producoesInseridas} novas inseridas, ${producoesDuplicadas} duplicadas ignoradas`);
  console.log(`- Paradas: ${paradasInseridas} novas inseridas, ${paradasDuplicadas} duplicadas ignoradas, ${paradasOrfas} sem correspondente`);

  if (!isCommit) {
    console.log("\n⚠️ NENHUM dado foi alterado no banco de dados.");
    console.log("Para efetuar a gravação de verdade, execute novamente com o flag --commit");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro durante a importação:", err);
  process.exit(1);
});
