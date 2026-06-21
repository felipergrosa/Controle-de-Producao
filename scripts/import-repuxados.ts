import "dotenv/config";
import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "../server/db";
import { products, repuxadores, causasQuebra, motivosParada, producaoRepuxados, paradasMaquina } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// Conversores de tipo do Excel
function parseExcelDate(val: any): Date {
  if (val instanceof Date) return val;
  const serial = Number(val);
  if (isNaN(serial)) return new Date();
  const date = new Date(Date.UTC(1899, 11, 30));
  date.setDate(date.getDate() + Math.floor(serial));
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0);
}

function parseExcelTime(val: any): string {
  if (!val) return "07:00";
  if (typeof val === "string") {
    if (val.includes(":")) return val.trim().slice(0, 5);
    return "07:00";
  }
  const num = Number(val);
  if (isNaN(num)) return "07:00";
  const totalMinutes = Math.round(num * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");

  console.log("=== SCRIPT DE IMPORTAÇÃO HISTÓRICA DE REPUXADOS (v2 - IDEMPOTENTE) ===");
  if (isCommit) {
    console.log(" MODO: GRAVAÇÃO ATIVA (--commit)");
  } else {
    console.log(" MODO: SIMULAÇÃO / TESTE (--dry-run). Nenhuma gravação ocorrerá no banco.");
    console.log(" Dica: Para gravar de verdade, execute: npx tsx scripts/import-repuxados.ts --commit");
  }

  const filePath = path.resolve("Controle Repuxado.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo '${filePath}' não encontrado na raiz do projeto.`);
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Erro: Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  console.log("Lendo arquivo Excel...");
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames.includes("DADOS") || !workbook.SheetNames.includes("CONTROLE")) {
    console.error("Erro: A planilha deve conter as abas 'DADOS' e 'CONTROLE'.");
    process.exit(1);
  }

  // ==========================================
  // PASSO 1: PROCESSAR ABA DADOS (Cadastros)
  // ==========================================
  console.log("\n[Passo 1] Processando aba DADOS (cadastros)...");
  const dadosRows = XLSX.utils.sheet_to_json(workbook.Sheets["DADOS"], { header: 1 }) as any[];

  const planProdutos: { nome: string; diametro: number; espessura: number; pesoG: number; idealPH: number }[] = [];
  const planRepuxadores: { nome: string }[] = [];
  const planMotivosParada: { descricao: string }[] = [];
  const planCausasQuebra: { descricao: string }[] = [];

  for (let i = 1; i < dadosRows.length; i++) {
    const row = dadosRows[i];
    if (!row) continue;
    const prodNome = row[0]?.toString().trim();
    if (prodNome && !prodNome.startsWith("**")) {
      planProdutos.push({ nome: prodNome, diametro: Number(row[1]) || 0, espessura: Number(row[2]) || 0, pesoG: (Number(row[3]) || 0) * 1000, idealPH: Number(row[7]) || 0 });
    }
    const repNome = row[9]?.toString().trim();
    if (repNome) planRepuxadores.push({ nome: repNome.toUpperCase() });
    const motivoDesc = row[11]?.toString().trim();
    if (motivoDesc) planMotivosParada.push({ descricao: motivoDesc });
    const causaDesc = row[13]?.toString().trim();
    if (causaDesc) planCausasQuebra.push({ descricao: causaDesc });
  }

  const uniqProd = planProdutos.filter((v, i, s) => s.findIndex(t => t.nome === v.nome) === i);
  const uniqRep = planRepuxadores.filter((v, i, s) => s.findIndex(t => t.nome === v.nome) === i);
  const uniqMot = planMotivosParada.filter((v, i, s) => s.findIndex(t => t.descricao === v.descricao) === i);
  const uniqCau = planCausasQuebra.filter((v, i, s) => s.findIndex(t => t.descricao === v.descricao) === i);

  console.log(`- Planilha DADOS: ${uniqProd.length} produtos, ${uniqRep.length} operadores, ${uniqMot.length} motivos parada, ${uniqCau.length} causas quebra.`);

  // Carregar caches do banco
  console.log("Carregando dados existentes no banco...");
  const mapProdutos = new Map<string, string>();
  const mapRepuxadores = new Map<string, number>();
  const mapMotivosParada = new Map<string, number>();
  const mapCausasQuebra = new Map<string, number>();

  (await db.select().from(products)).forEach(p => mapProdutos.set(p.code.toUpperCase(), p.id));
  (await db.select().from(repuxadores)).forEach(r => mapRepuxadores.set(r.nome.toUpperCase(), r.id));
  (await db.select().from(motivosParada)).forEach(m => mapMotivosParada.set(m.descricao.toUpperCase(), m.id));
  (await db.select().from(causasQuebra)).forEach(c => mapCausasQuebra.set(c.descricao.toUpperCase(), c.id));

  // ─── Carregar CHAVES DE LANÇAMENTOS EXISTENTES para evitar duplicatas ───────
  // Chave: "DATA|PRODUCT_ID|REPUXADOR_ID|HORA_INICIO"
  console.log("Carregando índice de lançamentos já existentes (idempotência)...");
  const existingEntries = await db.select({
    dataProducao: producaoRepuxados.dataProducao,
    productId: producaoRepuxados.productId,
    repuxadorId: producaoRepuxados.repuxadorId,
    horaInicio: producaoRepuxados.horaInicio,
  }).from(producaoRepuxados);

  const existingKeys = new Set<string>();
  existingEntries.forEach(e => {
    const dataStr = typeof e.dataProducao === "string" ? e.dataProducao : (e.dataProducao as Date).toISOString().split("T")[0];
    existingKeys.add(`${dataStr}|${e.productId}|${e.repuxadorId}|${e.horaInicio}`);
  });
  console.log(`  ${existingKeys.size} lançamentos já no banco (serão pulados se duplicados).`);

  // Registrar novas dimensões no banco
  if (isCommit) {
    console.log("\nSalvando novas dimensões de cadastro no banco...");
    for (const rep of uniqRep) {
      if (!mapRepuxadores.has(rep.nome)) {
        const [r] = await db.insert(repuxadores).values({ nome: rep.nome, turnoPadrao: "Turno A", ativo: true });
        const id = (r as any).insertId;
        mapRepuxadores.set(rep.nome, id);
        console.log(`  + Operador: ${rep.nome} (ID: ${id})`);
      }
    }
    for (const mot of uniqMot) {
      const key = mot.descricao.toUpperCase();
      if (!mapMotivosParada.has(key)) {
        const [r] = await db.insert(motivosParada).values({ descricao: mot.descricao, ativo: true });
        const id = (r as any).insertId;
        mapMotivosParada.set(key, id);
        console.log(`  + Motivo parada: ${mot.descricao} (ID: ${id})`);
      }
    }
    for (const cau of uniqCau) {
      const key = cau.descricao.toUpperCase();
      if (!mapCausasQuebra.has(key)) {
        const [r] = await db.insert(causasQuebra).values({ descricao: cau.descricao, ativo: true });
        const id = (r as any).insertId;
        mapCausasQuebra.set(key, id);
        console.log(`  + Causa quebra: ${cau.descricao} (ID: ${id})`);
      }
    }
    for (const prod of uniqProd) {
      const key = prod.nome.toUpperCase();
      if (!mapProdutos.has(key)) {
        const uuid = crypto.randomUUID();
        await db.insert(products).values({ id: uuid, code: prod.nome, description: prod.nome, pesoUnitarioG: prod.pesoG.toFixed(3), diametroMm: prod.diametro.toFixed(3), espessuraMm: prod.espessura.toFixed(2), idealPecasHora: prod.idealPH });
        mapProdutos.set(key, uuid);
        console.log(`  + Produto: ${prod.nome}`);
      }
    }
  } else {
    // Dry-run: simular IDs temporários
    let fakeId = 99000;
    uniqRep.forEach(r => { if (!mapRepuxadores.has(r.nome)) mapRepuxadores.set(r.nome, fakeId++); });
    uniqMot.forEach(m => { const k = m.descricao.toUpperCase(); if (!mapMotivosParada.has(k)) mapMotivosParada.set(k, fakeId++); });
    uniqCau.forEach(c => { const k = c.descricao.toUpperCase(); if (!mapCausasQuebra.has(k)) mapCausasQuebra.set(k, fakeId++); });
    uniqProd.forEach(p => { const k = p.nome.toUpperCase(); if (!mapProdutos.has(k)) mapProdutos.set(k, crypto.randomUUID()); });
    console.log("Simulação de cadastros concluída.");
  }

  // ==========================================
  // PASSO 2: PROCESSAR ABA CONTROLE
  // ==========================================
  console.log("\n[Passo 2] Processando aba CONTROLE (lançamentos históricos)...");
  const controleRows = XLSX.utils.sheet_to_json(workbook.Sheets["CONTROLE"], { header: 1 }) as any[];

  let totalNovos = 0;
  let totalDuplicados = 0;
  let totalIgnorados = 0;
  let totalPecas = 0;
  let totalQuebras = 0;

  const lotes: any[] = [];
  const paradas: { indexLote: number; tempo: number; motivoDesc: string; setorDesc: string }[] = [];

  // Estatísticas por ano para o relatório final
  const porAno: Record<string, { novos: number; duplicados: number }> = {};

  for (let i = 1; i < controleRows.length; i++) {
    const row = controleRows[i];
    if (!row) continue;

    const rawData = row[0];
    const rawProd = row[1]?.toString().trim();
    const rawRep = row[2]?.toString().trim();

    if (!rawData || !rawProd || !rawRep) { totalIgnorados++; continue; }

    const dataDate = parseExcelDate(rawData);
    const dataStr = `${dataDate.getFullYear()}-${String(dataDate.getMonth() + 1).padStart(2, "0")}-${String(dataDate.getDate()).padStart(2, "0")}`;
    const ano = dataDate.getFullYear().toString();
    if (!porAno[ano]) porAno[ano] = { novos: 0, duplicados: 0 };

    const prodKey = rawProd.toUpperCase();
    const repKey = rawRep.toUpperCase();
    const horaInicio = parseExcelTime(row[3]);

    // Resolver produto
    let productId = mapProdutos.get(prodKey);
    if (!productId) {
      const uuid = crypto.randomUUID();
      if (isCommit) {
        await db.insert(products).values({ id: uuid, code: rawProd, description: rawProd, pesoUnitarioG: "0.000", diametroMm: "0.000", espessuraMm: "0.00", idealPecasHora: 0 });
        console.log(`  + Produto dinâmico: ${rawProd}`);
      }
      mapProdutos.set(prodKey, uuid);
      productId = uuid;
    }

    // Resolver repuxador
    let repuxadorId = mapRepuxadores.get(repKey);
    if (!repuxadorId) {
      if (isCommit) {
        const [r] = await db.insert(repuxadores).values({ nome: rawRep.toUpperCase(), turnoPadrao: "Turno A", ativo: true });
        const id = (r as any).insertId;
        mapRepuxadores.set(repKey, id);
        repuxadorId = id;
        console.log(`  + Operador dinâmico: ${rawRep}`);
      } else {
        const fakeId = Math.floor(Math.random() * 1000) + 9999000;
        mapRepuxadores.set(repKey, fakeId);
        repuxadorId = fakeId;
      }
    }

    // ─── VERIFICAR DUPLICATA ─────────────────────────────────────────────────
    const dedupeKey = `${dataStr}|${productId}|${repuxadorId}|${horaInicio}`;
    if (existingKeys.has(dedupeKey)) {
      totalDuplicados++;
      porAno[ano].duplicados++;
      continue;
    }
    // Marcar como processado para evitar duplicatas dentro da própria planilha
    existingKeys.add(dedupeKey);
    // ─────────────────────────────────────────────────────────────────────────

    const horaFim = parseExcelTime(row[4]);
    const pecasProd = Number(row[7]) || 0;
    const pecasQueb = Number(row[9]) || 0;

    // Causa de quebra
    const rawCausa = row[13]?.toString().trim();
    let causaQuebraId: number | undefined;
    if (pecasQueb > 0 && rawCausa) {
      const causaKey = rawCausa.toUpperCase();
      let id = mapCausasQuebra.get(causaKey);
      if (!id) {
        if (isCommit) {
          const [r] = await db.insert(causasQuebra).values({ descricao: rawCausa, ativo: true });
          id = (r as any).insertId;
          mapCausasQuebra.set(causaKey, id);
        } else {
          id = Math.floor(Math.random() * 1000) + 888000;
          mapCausasQuebra.set(causaKey, id);
        }
      }
      causaQuebraId = id;
    }

    const producaoUuid = crypto.randomUUID();
    lotes.push({
      id: producaoUuid,
      productId,
      repuxadorId,
      dataProducao: dataStr,
      turno: "Turno A",
      horaInicio,
      horaFim,
      pecasProduzidas: pecasProd,
      pecasQuebradas: pecasQueb,
      causaQuebraId: causaQuebraId ?? null,
      obs: rawCausa ? `Causa: ${rawCausa}` : null,
      createdBy: 1,
    });

    // Parada de máquina
    const tempoMinutos = Math.round(Number(row[5] || 0) * 24 * 60);
    const setorParada = row[12]?.toString().trim();
    if (setorParada && tempoMinutos > 0) {
      const setorKey = setorParada.toUpperCase();
      let motId = mapMotivosParada.get(setorKey);
      if (!motId) {
        if (isCommit) {
          const [r] = await db.insert(motivosParada).values({ descricao: setorParada, ativo: true });
          motId = (r as any).insertId;
          mapMotivosParada.set(setorKey, motId);
        } else {
          motId = Math.floor(Math.random() * 1000) + 777000;
          mapMotivosParada.set(setorKey, motId);
        }
      }
      paradas.push({ indexLote: lotes.length - 1, tempo: tempoMinutos, motivoDesc: `Setor: ${setorParada}`, setorDesc: setorParada });
    }

    totalNovos++;
    totalPecas += pecasProd;
    totalQuebras += pecasQueb;
    porAno[ano].novos++;
  }

  // ─── RELATÓRIO ──────────────────────────────────────────────────────────────
  console.log(`\n📊 RESUMO DA IMPORTAÇÃO:`);
  console.log(`  ✅ Novos lançamentos para gravar : ${totalNovos}`);
  console.log(`  ♻️  Duplicados ignorados          : ${totalDuplicados}`);
  console.log(`  ⚠️  Linhas inválidas ignoradas    : ${totalIgnorados}`);
  console.log(`  📦 Peças produzidas (novas)       : ${totalPecas}`);
  console.log(`  🔴 Peças quebradas (novas)        : ${totalQuebras}`);
  console.log(`\n  Por ano:`);
  Object.entries(porAno).sort().forEach(([ano, v]) => {
    console.log(`    ${ano}: +${v.novos} novos | ${v.duplicados} já existiam`);
  });

  if (isCommit && lotes.length > 0) {
    console.log("\nSalvando lançamentos no banco...");
    await db.transaction(async (tx) => {
      const batchSize = 100;
      for (let i = 0; i < lotes.length; i += batchSize) {
        const batch = lotes.slice(i, i + batchSize);
        await tx.insert(producaoRepuxados).values(batch);
        console.log(`  Gravados ${i + batch.length}/${lotes.length} lançamentos...`);
      }
      if (paradas.length > 0) {
        const paradasValues = paradas.map(p => ({
          id: crypto.randomUUID(),
          producaoRepuxadosId: lotes[p.indexLote].id,
          tempoMinutos: p.tempo,
          motivo: p.motivoDesc,
          motivoParadaId: mapMotivosParada.get(p.setorDesc.toUpperCase()),
        }));
        for (let i = 0; i < paradasValues.length; i += batchSize) {
          await tx.insert(paradasMaquina).values(paradasValues.slice(i, i + batchSize));
        }
        console.log(`  + ${paradas.length} paradas de máquina gravadas.`);
      }
    });
    console.log("\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  } else if (!isCommit) {
    console.log("\n[Simulação] Passe --commit para gravar no banco.");
  } else {
    console.log("\nNenhum lançamento novo encontrado para gravar.");
  }
}

void main();
