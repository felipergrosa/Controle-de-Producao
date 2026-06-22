import { eq, desc, and, lte, gte, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { politicaJornada, PoliticaJornada } from "../drizzle/schema";

// ==========================================
// HELPER: conversão de tempo
// ==========================================
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutesToHours(minutes: number): number {
  return Number((minutes / 60).toFixed(2));
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}min`;
}

// ==========================================
// CRUD POLÍTICA DE JORNADA
// ==========================================

export async function getAllPoliticasJornada(): Promise<PoliticaJornada[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(politicaJornada)
    .orderBy(desc(politicaJornada.vigenciaInicio));
}

export async function getPoliticaJornadaById(id: number): Promise<PoliticaJornada | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(politicaJornada)
    .where(eq(politicaJornada.id, id))
    .limit(1);
  return result[0];
}

/**
 * Retorna a política vigente para uma data específica.
 * Usa vigenciaFim = NULL como "ainda vigente" ou maior que a data.
 */
export async function getPoliticaVigente(date: Date): Promise<PoliticaJornada | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const dateStr = date.toISOString().split("T")[0];

  const result = await db
    .select()
    .from(politicaJornada)
    .where(
      and(
        eq(politicaJornada.ativo, true),
        lte(politicaJornada.vigenciaInicio, dateStr as any),
        or(
          isNull(politicaJornada.vigenciaFim),
          gte(politicaJornada.vigenciaFim, dateStr as any)
        )
      )
    )
    .orderBy(desc(politicaJornada.vigenciaInicio))
    .limit(1);

  return result[0];
}

export async function createPoliticaJornada(
  input: Omit<PoliticaJornada, "id" | "createdAt" | "updatedAt">
): Promise<PoliticaJornada> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(politicaJornada).values({
    ...input,
    vigenciaInicio: input.vigenciaInicio as any,
    vigenciaFim: input.vigenciaFim as any ?? null,
    custoHoraReais: input.custoHoraReais ? String(input.custoHoraReais) as any : null,
  });

  const created = await getPoliticaJornadaById(result.insertId);
  if (!created) throw new Error("Erro ao criar política de jornada");
  return created;
}

export async function updatePoliticaJornada(
  id: number,
  input: Partial<Omit<PoliticaJornada, "id" | "createdAt" | "updatedAt">>
): Promise<PoliticaJornada> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(politicaJornada).set({
    ...input,
    vigenciaFim: input.vigenciaFim !== undefined ? input.vigenciaFim as any : undefined,
    custoHoraReais: input.custoHoraReais !== undefined
      ? (input.custoHoraReais ? String(input.custoHoraReais) as any : null)
      : undefined,
  }).where(eq(politicaJornada.id, id));

  const updated = await getPoliticaJornadaById(id);
  if (!updated) throw new Error("Política de jornada não encontrada");
  return updated;
}

export async function deactivatePoliticaJornada(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(politicaJornada).set({ ativo: false }).where(eq(politicaJornada.id, id));
}

// ==========================================
// MOTOR DE CÁLCULO DE JORNADA
// ==========================================

/**
 * Dado um dia da semana (0=Dom,1=Seg,...,6=Sab) e uma política,
 * retorna os minutos trabalhávei naquele dia.
 */
export function calcularMinutosDia(dowIndex: number, politica: PoliticaJornada): number {
  // Mapa: dow 0=dom,1=seg,2=ter,3=qua,4=qui,5=sex,6=sab
  const diasAtivos = [
    politica.domingo,
    politica.segunda,
    politica.terca,
    politica.quarta,
    politica.quinta,
    politica.sexta,
    politica.sabado,
  ];

  if (!diasAtivos[dowIndex]) return 0;

  const manha =
    timeToMinutes(politica.manhaFim) - timeToMinutes(politica.manhaInicio);

  // Sexta (dow=5): usa tardeFimSex; demais: tardeFimSegQui
  const tardeFim = dowIndex === 5 ? politica.tardeFimSex : politica.tardeFimSegQui;
  const tarde = timeToMinutes(tardeFim) - timeToMinutes(politica.tardeInicio);

  return Math.max(0, manha) + Math.max(0, tarde);
}

/**
 * Verifica se um dia da semana é útil conforme a política.
 */
export function isDiaUtil(dowIndex: number, politica: PoliticaJornada): boolean {
  const diasAtivos = [
    politica.domingo, politica.segunda, politica.terca,
    politica.quarta, politica.quinta, politica.sexta, politica.sabado,
  ];
  return !!diasAtivos[dowIndex];
}

/**
 * Calcula o total de minutos disponíveis em um intervalo de datas
 * conforme a política de jornada vigente.
 * Itera dia a dia e soma os minutos de cada dia útil.
 */
export function calcularMinutosDisponiveisPeriodo(
  startDate: Date,
  endDate: Date,
  politica: PoliticaJornada
): { totalMinutos: number; diasUteis: number; diasCalendario: number } {
  let totalMinutos = 0;
  let diasUteis = 0;
  let diasCalendario = 0;

  // Iterar dia a dia
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    diasCalendario++;
    const dow = current.getDay();
    const minsDia = calcularMinutosDia(dow, politica);
    if (minsDia > 0) {
      totalMinutos += minsDia;
      diasUteis++;
    }
    current.setDate(current.getDate() + 1);
  }

  return { totalMinutos, diasUteis, diasCalendario };
}

// ==========================================
// MÉTRICAS DE JORNADA POR OPERADOR
// ==========================================

export interface MetricasOperador {
  id: number;
  nome: string;
  cor: string | null;
  // Jornada
  minutosDisponiveis: number;
  horasDisponiveis: number;
  minutosTrabalhados: number;
  horasTrabalhadas: number;
  taxaPresenca: number;          // %
  diasUteisPeriodo: number;
  diasTrabalhados: number;
  diasAusentes: number;
  // Produção
  totalKg: number;
  totalPecas: number;
  totalPecasQuebradas: number;
  quebraPct: number;
  kgPorHora: number;             // produtividade: kg por hora trabalhada
  oeeMedio: number;              // OEE médio (%)
  // Custo (só se configurado)
  custoTotal: number | null;     // R$ total do período
  custoPorKg: number | null;     // R$/kg produzido
  custoHora: number | null;      // R$/hora (vem da política)
  // Alertas
  alertas: string[];
}

export interface ResumoJornada {
  diasUteisPeriodo: number;
  minutosDisponiveisPorDia: number;
  horasDisponiveisPorDia: number;
  minutosDisponiveisTotais: number;
  horasDisponiveisTotais: number;
  politicaVigente: PoliticaJornada | null;
  totalOperadoresAtivos: number;
  totalHorasTrabalhadasEquipe: number;
  taxaPresencaMedia: number;
  totalKgEquipe: number;
  custoTotalEquipe: number | null;
}

/**
 * Calcula métricas completas de jornada para cada operador.
 * Recebe os dados de lançamentos já filtrados do dashboard.
 */
export function calcularMetricasOperadores(
  data: any[], // rows dos lançamentos de producaoRepuxados com joins
  startDate: Date,
  endDate: Date,
  politica: PoliticaJornada
): MetricasOperador[] {
  const custoHora = politica.custoHoraReais ? Number(politica.custoHoraReais) : null;

  // Calcular dias úteis e minutos disponíveis no período
  const { totalMinutos: minutosDisponiveisPeriodo, diasUteis } =
    calcularMinutosDisponiveisPeriodo(startDate, endDate, politica);

  // Agrupar por repuxador
  const map: Record<number, {
    id: number;
    nome: string;
    cor: string | null;
    totalPecas: number;
    totalPecasQuebradas: number;
    totalKg: number;
    minutosTrabalhados: number;
    datasDistintas: Set<string>;
    somaOee: number;
    qtdOee: number;
  }> = {};

  for (const row of data) {
    const rid = row.repuxadorId;
    if (!map[rid]) {
      map[rid] = {
        id: rid,
        nome: row.repuxadorNome || `Operador #${rid}`,
        cor: row.repuxadorCor || null,
        totalPecas: 0,
        totalPecasQuebradas: 0,
        totalKg: 0,
        minutosTrabalhados: 0,
        datasDistintas: new Set(),
        somaOee: 0,
        qtdOee: 0,
      };
    }

    const r = map[rid];
    const pesoG = Number(row.pesoUnitarioG || 0);
    const kgProd = (row.pecasProduzidas * pesoG) / 1000;

    r.totalPecas += row.pecasProduzidas;
    r.totalPecasQuebradas += row.pecasQuebradas;
    r.totalKg += kgProd;

    // Minutos trabalhados neste lançamento
    const minInicio = timeToMinutes(row.horaInicio);
    const minFim = timeToMinutes(row.horaFim);
    let duracao = minFim - minInicio;
    if (duracao < 0) duracao += 24 * 60;
    r.minutosTrabalhados += duracao;

    // Data distinta (para calcular dias trabalhados)
    const dataStr =
      typeof row.dataProducao === "string"
        ? row.dataProducao
        : (row.dataProducao as Date).toISOString().split("T")[0];
    r.datasDistintas.add(dataStr);

    // OEE do lote para média ponderada
    const paradasTempo = (row.paradas || []).reduce(
      (acc: number, p: any) => acc + Number(p.tempoMinutos || 0), 0
    );
    const tempoOperando = duracao - paradasTempo;
    if (duracao > 0 && row.pecasProduzidas > 0) {
      const disp = Math.max(0, Math.min(1, tempoOperando / duracao));
      const qual = Math.max(0, Math.min(1,
        (row.pecasProduzidas - row.pecasQuebradas) / row.pecasProduzidas
      ));
      const idealPH = Number(row.idealPecasHora || 0);
      let perf = 1;
      if (idealPH > 0 && tempoOperando > 0) {
        perf = Math.max(0, Math.min(1.5, row.pecasProduzidas / ((tempoOperando / 60) * idealPH)));
      }
      r.somaOee += disp * perf * qual;
      r.qtdOee++;
    }
  }

  // Converter para array de métricas
  return Object.values(map).map((r) => {
    const horasTrabalhadas = minutesToHours(r.minutosTrabalhados);
    const horasDisponiveis = minutesToHours(minutosDisponiveisPeriodo);
    const taxaPresenca = horasDisponiveis > 0
      ? Number(((horasTrabalhadas / horasDisponiveis) * 100).toFixed(1))
      : 0;
    const quebraPct = r.totalPecas > 0
      ? Number(((r.totalPecasQuebradas / r.totalPecas) * 100).toFixed(2))
      : 0;
    const kgPorHora = horasTrabalhadas > 0
      ? Number((r.totalKg / horasTrabalhadas).toFixed(2))
      : 0;
    const oeeMedio = r.qtdOee > 0
      ? Number(((r.somaOee / r.qtdOee) * 100).toFixed(1))
      : 100;

    const custoTotal = custoHora !== null
      ? Number((horasTrabalhadas * custoHora).toFixed(2))
      : null;
    const custoPorKg =
      custoTotal !== null && r.totalKg > 0
        ? Number((custoTotal / r.totalKg).toFixed(4))
        : null;

    // Alertas automáticos
    const alertas: string[] = [];
    if (taxaPresenca < 80 && horasDisponiveis > 0) {
      alertas.push(`Taxa de presença baixa: ${taxaPresenca}% (meta: ≥80%)`);
    }
    if (oeeMedio < 50 && r.qtdOee > 0) {
      alertas.push(`OEE crítico: ${oeeMedio}% (meta: ≥50%)`);
    }
    if (quebraPct > 2.5 && r.totalPecas > 0) {
      alertas.push(`Quebra acima da meta: ${quebraPct}% (meta: ≤2.5%)`);
    }
    if (kgPorHora < 10 && horasTrabalhadas > 2) {
      alertas.push(`Produtividade baixa: ${kgPorHora} kg/h (meta: ≥10 kg/h)`);
    }

    return {
      id: r.id,
      nome: r.nome,
      cor: r.cor,
      minutosDisponiveis: minutosDisponiveisPeriodo,
      horasDisponiveis,
      minutosTrabalhados: r.minutosTrabalhados,
      horasTrabalhadas,
      taxaPresenca,
      diasUteisPeriodo: diasUteis,
      diasTrabalhados: r.datasDistintas.size,
      diasAusentes: Math.max(0, diasUteis - r.datasDistintas.size),
      totalKg: Number(r.totalKg.toFixed(2)),
      totalPecas: r.totalPecas,
      totalPecasQuebradas: r.totalPecasQuebradas,
      quebraPct,
      kgPorHora,
      oeeMedio,
      custoTotal,
      custoPorKg,
      custoHora,
      alertas,
    };
  }).sort((a, b) => b.totalKg - a.totalKg);
}

/**
 * Retorna resumo geral de jornada do período (sem filtro por operador).
 */
export function calcularResumoJornada(
  metricas: MetricasOperador[],
  startDate: Date,
  endDate: Date,
  politica: PoliticaJornada
): ResumoJornada {
  const { totalMinutos, diasUteis } = calcularMinutosDisponiveisPeriodo(
    startDate, endDate, politica
  );
  const minsPorDia = diasUteis > 0 ? Math.round(totalMinutos / diasUteis) : 0;

  const totalHorasTrabalhadasEquipe = metricas.reduce(
    (acc, m) => acc + m.horasTrabalhadas, 0
  );
  const taxaPresencaMedia = metricas.length > 0
    ? Number((metricas.reduce((acc, m) => acc + m.taxaPresenca, 0) / metricas.length).toFixed(1))
    : 0;
  const totalKgEquipe = metricas.reduce((acc, m) => acc + m.totalKg, 0);
  const custoTotalEquipe = metricas.some(m => m.custoTotal !== null)
    ? metricas.reduce((acc, m) => acc + (m.custoTotal ?? 0), 0)
    : null;

  return {
    diasUteisPeriodo: diasUteis,
    minutosDisponiveisPorDia: minsPorDia,
    horasDisponiveisPorDia: minutesToHours(minsPorDia),
    minutosDisponiveisTotais: totalMinutos,
    horasDisponiveisTotais: minutesToHours(totalMinutos),
    politicaVigente: politica,
    totalOperadoresAtivos: metricas.length,
    totalHorasTrabalhadasEquipe: Number(totalHorasTrabalhadasEquipe.toFixed(2)),
    taxaPresencaMedia,
    totalKgEquipe: Number(totalKgEquipe.toFixed(2)),
    custoTotalEquipe: custoTotalEquipe !== null ? Number(custoTotalEquipe.toFixed(2)) : null,
  };
}

// Re-exportar helpers para uso no router
export { timeToMinutes, minutesToHours, minutesToHHMM };
