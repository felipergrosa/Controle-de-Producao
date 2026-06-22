import { sql, eq, and, desc, or, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import crypto from "crypto";
import { 
  repuxadores, 
  causasQuebra, 
  motivosParada,
  producaoRepuxados, 
  paradasMaquina, 
  metasRepuxo,
  products,
  users,
  turnos,
  Product,
  Repuxador,
  CausaQuebra,
  MotivoParada,
  ProducaoRepuxado,
  ParadaMaquina,
  MetaRepuxo,
  Turno
} from "../drizzle/schema";

// Helper para converter TIME (HH:MM ou HH:MM:SS) em minutos desde a meia-noite
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const hrs = parts[0] || 0;
  const mins = parts[1] || 0;
  return hrs * 60 + mins;
}

// ==========================================
// CRUD REPUXADORES
// ==========================================
export async function getAllRepuxadores(): Promise<Repuxador[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(repuxadores).orderBy(desc(repuxadores.ativo), repuxadores.nome);
}

export async function getRepuxadorById(id: number): Promise<Repuxador | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(repuxadores).where(eq(repuxadores.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRepuxador(nome: string, matricula?: string, turnoPadrao?: string, cor?: string, codigo?: string): Promise<Repuxador> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(repuxadores).values({
    nome,
    matricula: matricula || null,
    turnoPadrao: turnoPadrao || null,
    cor: cor || "#6366f1",
    codigo: codigo || "",
    ativo: true,
  });
  
  const newId = result.insertId;
  const created = await getRepuxadorById(newId);
  if (!created) throw new Error("Erro ao criar repuxador");
  return created;
}

export async function updateRepuxador(id: number, updates: Partial<Omit<Repuxador, "id" | "createdAt">>): Promise<Repuxador> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(repuxadores).set(updates).where(eq(repuxadores.id, id));
  const updated = await getRepuxadorById(id);
  if (!updated) throw new Error("Repuxador não encontrado para atualização");
  return updated;
}

export async function deleteRepuxador(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Apenas desativa para manter histórico e consistência referencial
  await db.update(repuxadores).set({ ativo: false }).where(eq(repuxadores.id, id));
}

// ==========================================
// CRUD CAUSAS DE QUEBRA
// ==========================================
export async function getAllCausasQuebra(): Promise<CausaQuebra[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(causasQuebra).orderBy(desc(causasQuebra.ativo), causasQuebra.descricao);
}

export async function getCausaQuebraById(id: number): Promise<CausaQuebra | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(causasQuebra).where(eq(causasQuebra.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCausaQuebra(descricao: string, cor?: string, codigo?: string): Promise<CausaQuebra> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(causasQuebra).values({
    descricao,
    cor: cor || "#ef4444",
    codigo: codigo || "",
    ativo: true,
  });
  
  const newId = result.insertId;
  const created = await getCausaQuebraById(newId);
  if (!created) throw new Error("Erro ao criar causa de quebra");
  return created;
}

export async function updateCausaQuebra(id: number, updates: Partial<Omit<CausaQuebra, "id" | "createdAt">>): Promise<CausaQuebra> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(causasQuebra).set(updates).where(eq(causasQuebra.id, id));
  const updated = await getCausaQuebraById(id);
  if (!updated) throw new Error("Causa não encontrada");
  return updated;
}

export async function deleteCausaQuebra(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Apenas desativa para manter histórico
  await db.update(causasQuebra).set({ ativo: false }).where(eq(causasQuebra.id, id));
}

// ==========================================
// CRUD MOTIVOS DE PARADA
// ==========================================
export async function getAllMotivosParada(): Promise<MotivoParada[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(motivosParada).orderBy(desc(motivosParada.ativo), motivosParada.descricao);
}

export async function getMotivoParadaById(id: number): Promise<MotivoParada | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(motivosParada).where(eq(motivosParada.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMotivoParada(descricao: string, cor?: string, codigo?: string): Promise<MotivoParada> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(motivosParada).values({
    descricao,
    cor: cor || "#f59e0b",
    codigo: codigo || "",
    ativo: true,
  });
  
  const newId = result.insertId;
  const created = await getMotivoParadaById(newId);
  if (!created) throw new Error("Erro ao criar motivo de parada");
  return created;
}

export async function updateMotivoParada(id: number, updates: Partial<Omit<MotivoParada, "id" | "createdAt">>): Promise<MotivoParada> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(motivosParada).set(updates).where(eq(motivosParada.id, id));
  const updated = await getMotivoParadaById(id);
  if (!updated) throw new Error("Motivo de parada não encontrado");
  return updated;
}

export async function deleteMotivoParada(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Apenas desativa para manter histórico
  await db.update(motivosParada).set({ ativo: false }).where(eq(motivosParada.id, id));
}

// ==========================================
// LANÇAMENTOS DE REPUXO E PARADAS
// ==========================================
export interface InsertProducaoRepuxadoInput {
  productId: string;
  repuxadorId: number;
  dataProducao: Date | string;
  turno: string;
  horaInicio: string;
  horaFim: string;
  pecasProduzidas: number;
  pecasQuebradas?: number;
  causaQuebraId?: number;
  obs?: string;
  createdBy?: number;
  paradas?: Array<{
    tempoMinutos: number;
    motivo?: string;
    motivoParadaId?: number;
    causaQuebraId?: number;
  }>;
}

export async function createProducaoRepuxado(input: InsertProducaoRepuxadoInput): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = crypto.randomUUID();
  const dateStr = typeof input.dataProducao === "string" ? input.dataProducao.split("T")[0] : input.dataProducao.toISOString().split("T")[0];
  
  // Transação para salvar lançamento e paradas associadas
  await db.transaction(async (tx) => {
    await tx.insert(producaoRepuxados).values({
      id,
      productId: input.productId,
      repuxadorId: input.repuxadorId,
      dataProducao: dateStr as any,
      turno: input.turno,
      horaInicio: input.horaInicio,
      horaFim: input.horaFim,
      pecasProduzidas: input.pecasProduzidas,
      pecasQuebradas: input.pecasQuebradas ?? 0,
      causaQuebraId: input.causaQuebraId || null,
      obs: input.obs || null,
      createdBy: input.createdBy || null,
    });
    
    if (input.paradas && input.paradas.length > 0) {
      for (const p of input.paradas) {
        if (p.tempoMinutos > 0) {
          await tx.insert(paradasMaquina).values({
            id: crypto.randomUUID(),
            producaoRepuxadosId: id,
            tempoMinutos: p.tempoMinutos,
            motivo: p.motivo || null,
            motivoParadaId: p.motivoParadaId || null,
            causaQuebraId: p.causaQuebraId || null,
          });
        }
      }
    }
  });
  
  return { id, success: true };
}

export async function getProducaoRepuxados(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];
  
  // Realiza query trazendo relacionamento de Produto e Repuxador
  const rows = await db
    .select({
      id: producaoRepuxados.id,
      productId: producaoRepuxados.productId,
      productCode: products.code,
      productDescription: products.description,
      pesoUnitarioG: products.pesoUnitarioG,
      diametroMm: products.diametroMm,
      espessuraMm: products.espessuraMm,
      idealPecasHora: products.idealPecasHora,
      metaQuebraPct: products.metaQuebraPct,
      repuxadorId: producaoRepuxados.repuxadorId,
      repuxadorNome: repuxadores.nome,
      repuxadorCor: repuxadores.cor,
      repuxadorCodigo: repuxadores.codigo,
      dataProducao: producaoRepuxados.dataProducao,
      turno: producaoRepuxados.turno,
      turnoCor: turnos.cor,
      horaInicio: producaoRepuxados.horaInicio,
      horaFim: producaoRepuxados.horaFim,
      pecasProduzidas: producaoRepuxados.pecasProduzidas,
      pecasQuebradas: producaoRepuxados.pecasQuebradas,
      causaQuebraId: producaoRepuxados.causaQuebraId,
      causaDescricao: causasQuebra.descricao,
      obs: producaoRepuxados.obs,
      createdBy: producaoRepuxados.createdBy,
      createdName: users.name,
      createdAt: producaoRepuxados.createdAt,
    })
    .from(producaoRepuxados)
    .innerJoin(products, eq(producaoRepuxados.productId, products.id))
    .innerJoin(repuxadores, eq(producaoRepuxados.repuxadorId, repuxadores.id))
    .leftJoin(causasQuebra, eq(producaoRepuxados.causaQuebraId, causasQuebra.id))
    .leftJoin(users, eq(producaoRepuxados.createdBy, users.id))
    .leftJoin(turnos, eq(producaoRepuxados.turno, turnos.codigo))
    .where(
      and(
        gte(producaoRepuxados.dataProducao, startStr as any),
        lte(producaoRepuxados.dataProducao, endStr as any)
      )
    )
    .orderBy(desc(producaoRepuxados.dataProducao), desc(producaoRepuxados.createdAt));

  // Trazer também as paradas de cada produção
  const result = [];
  for (const row of rows) {
    const paradas = await db
      .select({
        id: paradasMaquina.id,
        tempoMinutos: paradasMaquina.tempoMinutos,
        motivo: paradasMaquina.motivo,
        motivoParadaId: paradasMaquina.motivoParadaId,
        causaQuebraId: paradasMaquina.causaQuebraId,
        causaDescricao: motivosParada.descricao,
      })
      .from(paradasMaquina)
      .leftJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
      .where(eq(paradasMaquina.producaoRepuxadosId, row.id));

    result.push({
      ...row,
      paradas,
    });
  }
  
  return result;
}

export async function deleteProducaoRepuxado(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(producaoRepuxados).where(eq(producaoRepuxados.id, id));
}

// ==========================================
// ESTATÍSTICAS / OEE / METAS / RANKING
// ==========================================
export async function getDashboardStats(
  startDate: Date, 
  endDate: Date,
  filters?: {
    repuxadorId?: number | null;
    turno?: string | null;
    causaQuebraId?: number | null;
    motivoParadaId?: number | null;
    productId?: string | null;
    sortBy?: string | null;
  }
): Promise<any> {
  let data = await getProducaoRepuxados(startDate, endDate);

  // Filtragem local dos dados para o Dashboard
  if (filters) {
    if (filters.repuxadorId !== undefined && filters.repuxadorId !== null) {
      data = data.filter(row => row.repuxadorId === filters.repuxadorId);
    }
    if (filters.turno) {
      data = data.filter(row => row.turno === filters.turno);
    }
    if (filters.causaQuebraId !== undefined && filters.causaQuebraId !== null) {
      data = data.filter(row => row.causaQuebraId === filters.causaQuebraId);
    }
    if (filters.motivoParadaId !== undefined && filters.motivoParadaId !== null) {
      data = data.filter(row => row.paradas.some((p: any) => p.motivoParadaId === filters.motivoParadaId));
    }
    if (filters.productId) {
      data = data.filter(row => row.productId === filters.productId);
    }
  }
  
  let totalPecasProduzidas = 0;
  let totalPecasQuebradas = 0;
  let totalKgProduzido = 0;
  let totalKgQuebrado = 0;
  let totalTempoProducaoMinutos = 0;
  let totalTempoParadasMinutos = 0;
  
  // Variáveis para OEE ponderado por peças/tempo
  let somaDisponibilidadePonderada = 0;
  let somaPerformancePonderada = 0;
  let somaQualidadePonderada = 0;
  let contagemValidaOEE = 0;

  for (const row of data) {
    const pesoG = Number(row.pesoUnitarioG || 0);
    const idealPH = Number(row.idealPecasHora || 0);
    
    const pecasBons = row.pecasProduzidas - row.pecasQuebradas;
    
    totalPecasProduzidas += row.pecasProduzidas;
    totalPecasQuebradas += row.pecasQuebradas;
    
    // KG produzido = Peças Produzidas * Peso Unitário (convertido de g para kg)
    const kgProd = (row.pecasProduzidas * pesoG) / 1000;
    const kgQueb = (row.pecasQuebradas * pesoG) / 1000;
    
    totalKgProduzido += kgProd;
    totalKgQuebrado += kgQueb;

    // Calcular tempo total do lote
    const minInicio = timeToMinutes(row.horaInicio);
    const minFim = timeToMinutes(row.horaFim);
    let duracaoMinutos = minFim - minInicio;
    if (duracaoMinutos < 0) {
      // Caso passe da meia-noite
      duracaoMinutos += 24 * 60;
    }
    
    totalTempoProducaoMinutos += duracaoMinutos;

    // Calcular paradas
    const paradasTempo = row.paradas.reduce((acc: number, cur: any) => acc + Number(cur.tempoMinutos || 0), 0);
    totalTempoParadasMinutos += paradasTempo;

    const tempoOperando = duracaoMinutos - paradasTempo;
    
    // OEE do lote
    if (duracaoMinutos > 0 && row.pecasProduzidas > 0) {
      const disp = Math.max(0, Math.min(1, tempoOperando / duracaoMinutos));
      const qual = Math.max(0, Math.min(1, pecasBons / row.pecasProduzidas));
      
      let perf = 1; // Padrão se não houver meta ideal p/h
      if (idealPH > 0 && tempoOperando > 0) {
        const pecasEsperadas = (tempoOperando / 60) * idealPH;
        perf = Math.max(0, Math.min(1.5, row.pecasProduzidas / pecasEsperadas)); // performance pode passar de 100% se for muito eficiente, limitamos em 150%
      }
      
      somaDisponibilidadePonderada += disp;
      somaPerformancePonderada += perf;
      somaQualidadePonderada += qual;
      contagemValidaOEE++;
    }
  }

  const pctQuebraMedia = totalPecasProduzidas > 0 ? (totalPecasQuebradas / totalPecasProduzidas) * 100 : 0;
  
  const oeeGeral = contagemValidaOEE > 0 ? {
    disponibilidade: (somaDisponibilidadePonderada / contagemValidaOEE) * 100,
    performance: (somaPerformancePonderada / contagemValidaOEE) * 100,
    qualidade: (somaQualidadePonderada / contagemValidaOEE) * 100,
    oee: ((somaDisponibilidadePonderada / contagemValidaOEE) * 
          (somaPerformancePonderada / contagemValidaOEE) * 
          (somaQualidadePonderada / contagemValidaOEE)) * 100
  } : { disponibilidade: 100, performance: 100, qualidade: 100, oee: 100 };

  // Pareto de causas de quebra
  const causasAgrupadas: Record<string, { causa: string, pecas: number, pesoKg: number }> = {};
  for (const row of data) {
    if (row.pecasQuebradas > 0) {
      const descCausa = row.causaDescricao || "Não informada";
      const pesoG = Number(row.pesoUnitarioG || 0);
      const kgQueb = (row.pecasQuebradas * pesoG) / 1000;
      
      if (!causasAgrupadas[descCausa]) {
        causasAgrupadas[descCausa] = { causa: descCausa, pecas: 0, pesoKg: 0 };
      }
      causasAgrupadas[descCausa].pecas += row.pecasQuebradas;
      causasAgrupadas[descCausa].pesoKg += kgQueb;
    }
  }

  const paretoCausas = Object.values(causasAgrupadas).sort((a, b) => b.pecas - a.pecas);

  // Ranking de repuxadores
  const rankingRepuxadores: Record<number, { 
    id: number; 
    nome: string; 
    cor?: string | null;
    totalPecas: number; 
    totalQuebradas: number; 
    totalKg: number; 
    totalKgQuebrado: number; 
    somaOee: number; 
    quantLancamentos: number;
    quebraPct: number;
  }> = {};

  for (const row of data) {
    const idRepuxador = row.repuxadorId;
    const pesoG = Number(row.pesoUnitarioG || 0);
    const kgProd = (row.pecasProduzidas * pesoG) / 1000;
    const kgQueb = (row.pecasQuebradas * pesoG) / 1000;

    if (!rankingRepuxadores[idRepuxador]) {
      rankingRepuxadores[idRepuxador] = {
        id: idRepuxador,
        nome: row.repuxadorNome,
        cor: row.repuxadorCor,
        totalPecas: 0,
        totalQuebradas: 0,
        totalKg: 0,
        totalKgQuebrado: 0,
        somaOee: 0,
        quantLancamentos: 0,
        quebraPct: 0,
      };
    }
    
    rankingRepuxadores[idRepuxador].totalPecas += row.pecasProduzidas;
    rankingRepuxadores[idRepuxador].totalQuebradas += row.pecasQuebradas;
    rankingRepuxadores[idRepuxador].totalKg += kgProd;
    rankingRepuxadores[idRepuxador].totalKgQuebrado += kgQueb;
    
    // Cálculo OEE simplificado do lote para o ranking
    const minInicio = timeToMinutes(row.horaInicio);
    const minFim = timeToMinutes(row.horaFim);
    let duracaoMinutos = minFim - minInicio;
    if (duracaoMinutos < 0) duracaoMinutos += 24 * 60;
    
    const paradasTempo = row.paradas.reduce((acc: number, cur: any) => acc + Number(cur.tempoMinutos || 0), 0);
    const tempoOperando = duracaoMinutos - paradasTempo;
    
    let oeeLote = 1;
    if (duracaoMinutos > 0 && row.pecasProduzidas > 0) {
      const disp = Math.max(0, Math.min(1, tempoOperando / duracaoMinutos));
      const qual = Math.max(0, Math.min(1, (row.pecasProduzidas - row.pecasQuebradas) / row.pecasProduzidas));
      let perf = 1;
      const idealPH = Number(row.idealPecasHora || 0);
      if (idealPH > 0 && tempoOperando > 0) {
        perf = Math.max(0, Math.min(1.5, row.pecasProduzidas / ((tempoOperando / 60) * idealPH)));
      }
      oeeLote = disp * perf * qual;
    }
    
    rankingRepuxadores[idRepuxador].somaOee += oeeLote;
    rankingRepuxadores[idRepuxador].quantLancamentos++;
  }

  const listRanking = Object.values(rankingRepuxadores).map(rep => {
    const quebra = rep.totalPecas > 0 ? (rep.totalQuebradas / rep.totalPecas) * 100 : 0;
    const oeeMedio = rep.quantLancamentos > 0 ? (rep.somaOee / rep.quantLancamentos) * 100 : 100;
    return {
      id: rep.id,
      nome: rep.nome,
      cor: rep.cor,
      totalPecas: rep.totalPecas,
      totalQuebradas: rep.totalQuebradas,
      totalKg: rep.totalKg,
      totalKgQuebrado: rep.totalKgQuebrado,
      quebraPct: Number(quebra.toFixed(2)),
      oeeMedio: Number(oeeMedio.toFixed(1)),
    };
  });

  if (filters?.sortBy === "producao_asc") {
    listRanking.sort((a, b) => a.totalKg - b.totalKg);
  } else if (filters?.sortBy === "oee_desc") {
    listRanking.sort((a, b) => b.oeeMedio - a.oeeMedio);
  } else if (filters?.sortBy === "quebra_desc") {
    listRanking.sort((a, b) => b.quebraPct - a.quebraPct);
  } else if (filters?.sortBy === "quebra_asc") {
    listRanking.sort((a, b) => a.quebraPct - b.quebraPct);
  } else {
    // Padrão: producao_desc
    listRanking.sort((a, b) => b.totalKg - a.totalKg);
  }

  // Evolução Diária
  const diario: Record<string, { data: string, pecas: number, quebra: number, kg: number, quebraPct: number }> = {};
  for (const row of data) {
    const key = typeof row.dataProducao === "string" ? row.dataProducao : (row.dataProducao as Date).toISOString().split("T")[0];
    const pesoG = Number(row.pesoUnitarioG || 0);
    const kgProd = (row.pecasProduzidas * pesoG) / 1000;
    
    if (!diario[key]) {
      diario[key] = { data: key, pecas: 0, quebra: 0, kg: 0, quebraPct: 0 };
    }
    diario[key].pecas += row.pecasProduzidas;
    diario[key].quebra += row.pecasQuebradas;
    diario[key].kg += kgProd;
  }
  
  const evolucaoDiaria = Object.values(diario).map(d => {
    const qPct = d.pecas > 0 ? (d.quebra / d.pecas) * 100 : 0;
    return {
      ...d,
      quebraPct: Number(qPct.toFixed(2)),
      kg: Number(d.kg.toFixed(2))
    };
  }).sort((a, b) => a.data.localeCompare(b.data));

  // Ranking de produtos mais repuxados
  const rankingProdutos: Record<string, { 
    id: string; 
    code: string; 
    description: string; 
    totalPecas: number; 
    totalKg: number; 
    totalQuebradas: number; 
    quebraPct: number; 
  }> = {};

  for (const row of data) {
    const prodId = row.productId;
    const code = row.productCode || "Sem código";
    const desc = row.productDescription || "Sem descrição";
    const pesoG = Number(row.pesoUnitarioG || 0);
    const kgProd = (row.pecasProduzidas * pesoG) / 1000;

    if (!rankingProdutos[prodId]) {
      rankingProdutos[prodId] = {
        id: prodId,
        code,
        description: desc,
        totalPecas: 0,
        totalKg: 0,
        totalQuebradas: 0,
        quebraPct: 0
      };
    }
    rankingProdutos[prodId].totalPecas += row.pecasProduzidas;
    rankingProdutos[prodId].totalKg += kgProd;
    rankingProdutos[prodId].totalQuebradas += row.pecasQuebradas;
  }

  const listProdutos = Object.values(rankingProdutos).map(p => {
    const qPct = p.totalPecas > 0 ? (p.totalQuebradas / p.totalPecas) * 100 : 0;
    return {
      id: p.id,
      code: p.code,
      description: p.description,
      totalKg: Number(p.totalKg.toFixed(2)),
      totalPecas: p.totalPecas,
      quebraPct: Number(qPct.toFixed(2))
    };
  }).sort((a, b) => b.totalKg - a.totalKg);

  return {
    totalPecasProduzidas,
    totalPecasQuebradas,
    totalKgProduzido: Number(totalKgProduzido.toFixed(2)),
    totalKgQuebrado: Number(totalKgQuebrado.toFixed(2)),
    pctQuebraMedia: Number(pctQuebraMedia.toFixed(2)),
    oeeGeral,
    paretoCausas,
    rankingRepuxadores: listRanking,
    rankingProdutos: listProdutos,
    evolucaoDiaria,
    totalTempoProducaoMinutos,
    totalTempoParadasMinutos,
    totalLancamentos: data.length,
  };
}

// ==========================================
// CRUD METAS DE REPUXO
// ==========================================
export async function getMetasRepuxoList(): Promise<MetaRepuxo[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(metasRepuxo).orderBy(desc(metasRepuxo.vigenciaInicio));
}

export async function createMetaRepuxo(input: Omit<MetaRepuxo, "id" | "createdAt">): Promise<MetaRepuxo> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(metasRepuxo).values({
    tipo: input.tipo,
    referenciaId: input.referenciaId || null,
    metaKgDia: input.metaKgDia,
    metaQuebraPct: input.metaQuebraPct,
    vigenciaInicio: input.vigenciaInicio,
    vigenciaFim: input.vigenciaFim || null,
  });
  
  const newId = result.insertId;
  const createdList = await db.select().from(metasRepuxo).where(eq(metasRepuxo.id, newId)).limit(1);
  if (createdList.length === 0) throw new Error("Erro ao criar meta");
  return createdList[0];
}

export async function deleteMetaRepuxo(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(metasRepuxo).where(eq(metasRepuxo.id, id));
}

export async function getMotivosParadaFrequentes(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const rows = await db
    .select({
      motivo: paradasMaquina.motivo,
    })
    .from(paradasMaquina)
    .orderBy(desc(paradasMaquina.createdAt))
    .limit(100);
    
  const motivos = rows
    .map(r => r.motivo?.trim())
    .filter((m): m is string => !!m);
    
  return Array.from(new Set(motivos)).slice(0, 15);
}

// ==========================================
// CRUD TURNOS
// ==========================================
export async function getAllTurnos(): Promise<Turno[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(turnos).orderBy(desc(turnos.ativo), turnos.descricao);
}

export async function getTurnoById(id: number): Promise<Turno | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(turnos).where(eq(turnos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTurno(codigo: string, descricao: string, cor?: string): Promise<Turno> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(turnos).values({
    codigo,
    descricao,
    cor: cor || "#6366f1",
    ativo: true,
  });
  
  const newId = result.insertId;
  const created = await getTurnoById(newId);
  if (!created) throw new Error("Erro ao criar turno");
  return created;
}

export async function updateTurno(id: number, updates: Partial<Omit<Turno, "id" | "createdAt">>): Promise<Turno> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(turnos).set(updates).where(eq(turnos.id, id));
  const updated = await getTurnoById(id);
  if (!updated) throw new Error("Turno não encontrado");
  return updated;
}

export async function deleteTurno(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(turnos).set({ ativo: false }).where(eq(turnos.id, id));
}

// ==========================================
// UPDATE DE LANÇAMENTO DE PRODUÇÃO
// ==========================================
export async function updateProducaoRepuxado(
  id: string,
  data: {
    productId: string;
    repuxadorId: number;
    dataProducao: string;
    turno: string;
    horaInicio: string;
    horaFim: string;
    pecasProduzidas: number;
    pecasQuebradas: number;
    causaQuebraId?: number | null;
    obs?: string | null;
    paradas?: { tempoMinutos: number; motivo?: string | null; motivoParadaId?: number | null }[];
  }
): Promise<ProducaoRepuxado> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const formattedDate = data.dataProducao.split("T")[0];

  // Atualizar o lançamento principal
  await db.update(producaoRepuxados).set({
    productId: data.productId,
    repuxadorId: data.repuxadorId,
    dataProducao: formattedDate as any,
    turno: data.turno,
    horaInicio: data.horaInicio,
    horaFim: data.horaFim,
    pecasProduzidas: data.pecasProduzidas,
    pecasQuebradas: data.pecasQuebradas,
    causaQuebraId: data.causaQuebraId ?? null,
    obs: data.obs ?? null,
  }).where(eq(producaoRepuxados.id, id));

  // Remover as paradas antigas
  await db.delete(paradasMaquina).where(eq(paradasMaquina.producaoRepuxadosId, id));

  // Inserir as novas paradas
  if (data.paradas && data.paradas.length > 0) {
    for (const p of data.paradas) {
      await db.insert(paradasMaquina).values({
        id: crypto.randomUUID(),
        producaoRepuxadosId: id,
        tempoMinutos: p.tempoMinutos,
        motivo: p.motivo ?? null,
        motivoParadaId: p.motivoParadaId ?? null,
        causaQuebraId: data.causaQuebraId ?? null,
      });
    }
  }

  const [updated] = await db.select().from(producaoRepuxados).where(eq(producaoRepuxados.id, id)).limit(1);
  if (!updated) throw new Error("Erro ao obter lançamento atualizado");
  return updated;
}
