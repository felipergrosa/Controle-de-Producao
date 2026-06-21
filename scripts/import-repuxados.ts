import "dotenv/config";
import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "../server/db";
import { products, repuxadores, causasQuebra, motivosParada, producaoRepuxados, paradasMaquina } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// Interfaces de suporte
interface PlanilhaProduto {
  nome: string;
  diametro: number;
  espessura: number;
  pesoG: number;
  idealPH: number;
}

interface PlanilhaCausa {
  descricao: string;
}

interface PlanilhaRepuxador {
  nome: string;
  turnoPadrao: string;
}

interface PlanilhaMotivoParada {
  descricao: string;
}

// Conversores de tipo do Excel
function parseExcelDate(val: any): Date {
  if (val instanceof Date) return val;
  const serial = Number(val);
  if (isNaN(serial)) {
    return new Date();
  }
  // Excel usa base 30/12/1899 devido a bug de ano bissexto em 1900
  const date = new Date(Date.UTC(1899, 11, 30));
  date.setDate(date.getDate() + Math.floor(serial));
  // Definir meio-dia local para blindar contra fuso horário
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

  console.log("=== SCRIPT DE IMPORTAÇÃO HISTÓRICA DE REPUXADOS ===");
  if (isCommit) {
    console.log(" MODO: GRAVAÇÃO ATIVA (--commit)");
  } else {
    console.log(" MODO: SIMULAÇÃO / TESTE (--dry-run). Nenhuma gravação ocorrerá no banco.");
    console.log(" Dica: Para gravar de verdade, execute: pnpm tsx scripts/import-repuxados.ts --commit");
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

  const abaDadosName = "DADOS";
  const abaControleName = "CONTROLE";

  if (!workbook.SheetNames.includes(abaDadosName) || !workbook.SheetNames.includes(abaControleName)) {
    console.error("Erro: A planilha deve conter as abas 'DADOS' e 'CONTROLE'.");
    process.exit(1);
  }

  // ==========================================
  // PASSO 1: PROCESSAR ABA DADOS (Cadastros)
  // ==========================================
  console.log("\n[Passo 1] Processando aba DADOS...");
  const sheetDados = workbook.Sheets[abaDadosName];
  const dadosRows = XLSX.utils.sheet_to_json(sheetDados, { header: 1 }) as any[];

  const planProdutos: PlanilhaProduto[] = [];
  const planRepuxadores: PlanilhaRepuxador[] = [];
  const planMotivosParada: PlanilhaMotivoParada[] = [];
  const planCausasQuebra: PlanilhaCausa[] = [];

  // Mapeamento das colunas da aba DADOS com base na análise prévia:
  // Col 0: PRODUTOS | Col 1: DIAM. | Col 2: ESP. | Col 3: PESO | Col 7: IDEAL P/H | Col 9: REPUXADOR | Col 11: SETOR RESPONSAVEL (Motivo Parada) | Col 13: TIPOS DE CAUSA QUEBRA
  for (let i = 1; i < dadosRows.length; i++) {
    const row = dadosRows[i];
    if (!row) continue;

    // Produtos
    const prodNome = row[0]?.toString().trim();
    if (prodNome && !prodNome.startsWith("**")) { // Ignora cabeçalhos internos como **REFILE**
      planProdutos.push({
        nome: prodNome,
        diametro: Number(row[1]) || 0,
        espessura: Number(row[2]) || 0,
        pesoG: (Number(row[3]) || 0) * 1000, // Multiplica por 1000 para converter de kg para gramas
        idealPH: Number(row[7]) || 0,
      });
    }

    // Repuxadores
    const repNome = row[9]?.toString().trim();
    if (repNome) {
      planRepuxadores.push({
        nome: repNome.toUpperCase(),
        turnoPadrao: "Turno A", // Fallback padrão
      });
    }

    // Motivos de Parada (Setor Responsável)
    const motivoDesc = row[11]?.toString().trim();
    if (motivoDesc) {
      planMotivosParada.push({
        descricao: motivoDesc,
      });
    }

    // Causas de Quebra
    const causaDesc = row[13]?.toString().trim();
    if (causaDesc) {
      planCausasQuebra.push({
        descricao: causaDesc,
      });
    }
  }

  // Filtrar duplicados locais nas listas
  const uniquePlanProdutos = planProdutos.filter((v, idx, self) => self.findIndex(t => t.nome === v.nome) === idx);
  const uniquePlanRepuxadores = planRepuxadores.filter((v, idx, self) => self.findIndex(t => t.nome === v.nome) === idx);
  const uniquePlanMotivosParada = planMotivosParada.filter((v, idx, self) => self.findIndex(t => t.descricao === v.descricao) === idx);
  const uniquePlanCausasQuebra = planCausasQuebra.filter((v, idx, self) => self.findIndex(t => t.descricao === v.descricao) === idx);

  console.log(`- Encontrados na planilha: ${uniquePlanProdutos.length} produtos, ${uniquePlanRepuxadores.length} operadores, ${uniquePlanMotivosParada.length} motivos de parada, ${uniquePlanCausasQuebra.length} causas de quebra.`);

  // Dicionários para cache de IDs correspondentes no banco
  const mapProdutos = new Map<string, string>(); // nome -> id
  const mapRepuxadores = new Map<string, number>(); // nome -> id
  const mapMotivosParada = new Map<string, number>(); // desc -> id
  const mapCausasQuebra = new Map<string, number>(); // desc -> id

  // Carregar dados existentes no banco para não duplicar
  console.log("Carregando tabelas do banco de dados...");
  const dbProducts = await db.select().from(products);
  const dbRepuxadores = await db.select().from(repuxadores);
  const dbMotivosParada = await db.select().from(motivosParada);
  const dbCausasQuebra = await db.select().from(causasQuebra);

  // Popular caches iniciais
  dbProducts.forEach(p => mapProdutos.set(p.code.toUpperCase(), p.id));
  dbRepuxadores.forEach(r => mapRepuxadores.set(r.nome.toUpperCase(), r.id));
  dbMotivosParada.forEach(m => mapMotivosParada.set(m.descricao.toUpperCase(), m.id));
  dbCausasQuebra.forEach(c => mapCausasQuebra.set(c.descricao.toUpperCase(), c.id));

  // Cadastrar novos elementos no banco (se --commit ativo)
  if (isCommit) {
    console.log("Salvando novas dimensões de cadastro no banco...");

    // Cadastrar novos operadores
    for (const rep of uniquePlanRepuxadores) {
      if (!mapRepuxadores.has(rep.nome)) {
        const [result] = await db.insert(repuxadores).values({
          nome: rep.nome,
          turnoPadrao: rep.turnoPadrao,
        });
        const newId = (result as any).insertId;
        mapRepuxadores.set(rep.nome, newId);
        console.log(`+ Operador cadastrado: ${rep.nome} (ID: ${newId})`);
      }
    }

    // Cadastrar novos motivos de parada (Setores)
    for (const mot of uniquePlanMotivosParada) {
      const key = mot.descricao.toUpperCase();
      if (!mapMotivosParada.has(key)) {
        const [result] = await db.insert(motivosParada).values({
          descricao: mot.descricao,
        });
        const newId = (result as any).insertId;
        mapMotivosParada.set(key, newId);
        console.log(`+ Motivo de parada cadastrado: ${mot.descricao} (ID: ${newId})`);
      }
    }

    // Cadastrar novas causas de quebra
    for (const cau of uniquePlanCausasQuebra) {
      const key = cau.descricao.toUpperCase();
      if (!mapCausasQuebra.has(key)) {
        const [result] = await db.insert(causasQuebra).values({
          descricao: cau.descricao,
        });
        const newId = (result as any).insertId;
        mapCausasQuebra.set(key, newId);
        console.log(`+ Causa de quebra cadastrada: ${cau.descricao} (ID: ${newId})`);
      }
    }

    // Cadastrar novos produtos
    for (const prod of uniquePlanProdutos) {
      const key = prod.nome.toUpperCase();
      if (!mapProdutos.has(key)) {
        const uuid = crypto.randomUUID();
        await db.insert(products).values({
          id: uuid,
          code: prod.nome,
          description: prod.nome,
          pesoUnitarioG: prod.pesoG.toFixed(3),
          diametroMm: prod.diametro.toFixed(3),
          espessuraMm: prod.espessura.toFixed(2),
          idealPecasHora: prod.idealPH,
        });
        mapProdutos.set(key, uuid);
        console.log(`+ Produto cadastrado: ${prod.nome} (ID: ${uuid})`);
      }
    }
  } else {
    // Modo dry-run: Apenas simular cadastros nos dicionários temporários
    let idCounter = 99000;
    uniquePlanRepuxadores.forEach(r => {
      if (!mapRepuxadores.has(r.nome)) {
        mapRepuxadores.set(r.nome, idCounter++);
      }
    });
    uniquePlanMotivosParada.forEach(m => {
      const key = m.descricao.toUpperCase();
      if (!mapMotivosParada.has(key)) {
        mapMotivosParada.set(key, idCounter++);
      }
    });
    uniquePlanCausasQuebra.forEach(c => {
      const key = c.descricao.toUpperCase();
      if (!mapCausasQuebra.has(key)) {
        mapCausasQuebra.set(key, idCounter++);
      }
    });
    uniquePlanProdutos.forEach(p => {
      const key = p.nome.toUpperCase();
      if (!mapProdutos.has(key)) {
        mapProdutos.set(key, crypto.randomUUID());
      }
    });
    console.log("Simulação de cadastros concluída.");
  }

  // ==========================================
  // PASSO 2: PROCESSAR ABA CONTROLE (Lançamentos de Produção)
  // ==========================================
  console.log("\n[Passo 2] Processando aba CONTROLE (Lançamentos históricos)...");
  const sheetControle = workbook.Sheets[abaControleName];
  const controleRows = XLSX.utils.sheet_to_json(sheetControle, { header: 1 }) as any[];

  let totalLancados = 0;
  let totalPecasProduzidas = 0;
  let totalQuebras = 0;
  let totalIgnorados = 0;

  // Coleções para lote
  const lotesProducao: any[] = [];
  const paradasParaVincular: { indexLote: number; tempo: number; motivoDesc: string; setorDesc: string }[] = [];

  // Mapeamento de colunas aba CONTROLE:
  // Col 0: DATA | Col 1: PRODUTO | Col 2: REPUXADOR | Col 3: HORA INÍCIO | Col 4: HORA FINAL | Col 7: QTD PRODUZIDA | Col 9: PERCAS | Col 12: SETOR RESP. (Parada) | Col 13: CAUSA
  for (let i = 1; i < controleRows.length; i++) {
    const row = controleRows[i];
    if (!row) continue;

    const rawData = row[0];
    const rawProd = row[1]?.toString().trim();
    const rawRep = row[2]?.toString().trim();

    if (!rawData || !rawProd || !rawRep) {
      totalIgnorados++;
      continue;
    }

    const dataProducaoDate = parseExcelDate(rawData);
    const prodKey = rawProd.toUpperCase();
    const repKey = rawRep.toUpperCase();

    // Buscar ou criar produto dinamicamente
    let productIdVal = mapProdutos.get(prodKey);
    if (!productIdVal) {
      const uuid = crypto.randomUUID();
      if (isCommit) {
        await db.insert(products).values({
          id: uuid,
          code: rawProd,
          description: rawProd,
          pesoUnitarioG: "0.000",
          diametroMm: "0.000",
          espessuraMm: "0.00",
          idealPecasHora: 0,
        });
        console.log(`+ Produto dinâmico criado (não estava na aba DADOS): ${rawProd} (ID: ${uuid})`);
      }
      mapProdutos.set(prodKey, uuid);
      productIdVal = uuid;
    }

    // Buscar ou criar operador dinamicamente
    let repuxadorIdVal = mapRepuxadores.get(repKey);
    if (!repuxadorIdVal) {
      if (isCommit) {
        const [result] = await db.insert(repuxadores).values({
          nome: rawRep.toUpperCase(),
          turnoPadrao: "Turno A",
        });
        const newId = (result as any).insertId;
        mapRepuxadores.set(repKey, newId);
        repuxadorIdVal = newId;
        console.log(`+ Operador dinâmico criado (não estava na aba DADOS): ${rawRep} (ID: ${newId})`);
      } else {
        const fakeId = Math.floor(Math.random() * 1000) + 9999000;
        mapRepuxadores.set(repKey, fakeId);
        repuxadorIdVal = fakeId;
      }
    }

    const horaInicioStr = parseExcelTime(row[3]);
    const horaFimStr = parseExcelTime(row[4]);
    const pecasProd = Number(row[7]) || 0;
    const pecasQueb = Number(row[9]) || 0;

    // Identificar ou criar causa de quebra dinamicamente
    const rawCausa = row[13]?.toString().trim();
    let causaQuebraIdVal: number | undefined = undefined;
    if (pecasQueb > 0 && rawCausa) {
      const causaKey = rawCausa.toUpperCase();
      let cachedId = mapCausasQuebra.get(causaKey);
      if (!cachedId) {
        if (isCommit) {
          const [result] = await db.insert(causasQuebra).values({
            descricao: rawCausa,
          });
          const newId = (result as any).insertId;
          mapCausasQuebra.set(causaKey, newId);
          causaQuebraIdVal = newId;
          console.log(`+ Causa de quebra dinâmica criada: ${rawCausa} (ID: ${newId})`);
        } else {
          const fakeId = Math.floor(Math.random() * 1000) + 888000;
          mapCausasQuebra.set(causaKey, fakeId);
          causaQuebraIdVal = fakeId;
        }
      } else {
        causaQuebraIdVal = cachedId;
      }
    }

    const producaoUuid = crypto.randomUUID();

    lotesProducao.push({
      id: producaoUuid,
      productId: productIdVal,
      repuxadorId: repuxadorIdVal,
      dataProducao: dataProducaoDate,
      turno: "Turno A", // Padrão histórico
      horaInicio: horaInicioStr,
      horaFim: horaFimStr,
      pecasProduzidas: pecasProd,
      pecasQuebradas: pecasQueb,
      causaQuebraId: causaQuebraIdVal,
      obs: rawCausa ? `Causa: ${rawCausa}` : null,
      createdBy: 1, // Admin default
    });

    // Se houver parada descrita na linha (Setor Responsável e tempo)
    const tempoTotalMinutos = Number(row[5] || 0) * 24 * 60; // Conversão de fração de dia para minutos
    const setorParada = row[12]?.toString().trim();
    if (setorParada && tempoTotalMinutos > 0) {
      const setorKey = setorParada.toUpperCase();
      let motivoParadaIdVal = mapMotivosParada.get(setorKey);
      if (!motivoParadaIdVal) {
        if (isCommit) {
          const [result] = await db.insert(motivosParada).values({
            descricao: setorParada,
          });
          const newId = (result as any).insertId;
          mapMotivosParada.set(setorKey, newId);
          motivoParadaIdVal = newId;
          console.log(`+ Motivo de parada dinâmico criado: ${setorParada} (ID: ${newId})`);
        } else {
          const fakeId = Math.floor(Math.random() * 1000) + 777000;
          mapMotivosParada.set(setorKey, fakeId);
          motivoParadaIdVal = fakeId;
        }
      }

      paradasParaVincular.push({
        indexLote: lotesProducao.length - 1,
        tempo: Math.round(tempoTotalMinutos),
        motivoDesc: `Setor: ${setorParada}`,
        setorDesc: setorParada,
      });
    }

    totalLancados++;
    totalPecasProduzidas += pecasProd;
    totalQuebras += pecasQueb;
  }

  console.log(`- Total de lançamentos preparados para gravação: ${totalLancados}`);
  console.log(`- Soma total de peças produzidas: ${totalPecasProduzidas}`);
  console.log(`- Soma total de quebras históricas: ${totalQuebras}`);
  console.log(`- Linhas vazias ignoradas: ${totalIgnorados}`);

  // Executar a gravação de fatos no banco
  if (isCommit && lotesProducao.length > 0) {
    console.log("\nSalvando lançamentos no banco de dados...");
    
    // Usando transação Drizzle
    await db.transaction(async (tx) => {
      // Inserir lançamentos de repuxo em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < lotesProducao.length; i += batchSize) {
        const batch = lotesProducao.slice(i, i + batchSize);
        await tx.insert(producaoRepuxados).values(batch);
        console.log(`+ Gravados ${i + batch.length}/${lotesProducao.length} lançamentos...`);
      }

      // Inserir paradas de máquina vinculadas
      if (paradasParaVincular.length > 0) {
        console.log("Gravando paradas de máquina vinculadas...");
        const paradasValues = paradasParaVincular.map(p => {
          const prodObj = lotesProducao[p.indexLote];
          const motivoParadaIdVal = mapMotivosParada.get(p.setorDesc.toUpperCase());
          return {
            id: crypto.randomUUID(),
            producaoRepuxadosId: prodObj.id,
            tempoMinutos: p.tempo,
            motivo: p.motivoDesc,
            motivoParadaId: motivoParadaIdVal,
          };
        });

        for (let i = 0; i < paradasValues.length; i += batchSize) {
          const batch = paradasValues.slice(i, i + batchSize);
          await tx.insert(paradasMaquina).values(batch);
        }
        console.log(`+ Gravadas ${paradasParaVincular.length} paradas de máquina.`);
      }
    });

    console.log("\n IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  } else {
    console.log("\n[Simulação] Fatos prontos para gravação. Rodar com '--commit' para aplicar.");
    if (paradasParaVincular.length > 0) {
      console.log(`[Simulação] ${paradasParaVincular.length} paradas de máquina seriam vinculadas.`);
    }
    console.log("Nenhuma alteração foi realizada no banco.");
  }
}

void main();
