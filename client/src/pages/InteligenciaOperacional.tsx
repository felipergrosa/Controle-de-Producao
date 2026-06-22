import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Award,
  Activity,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HelpTooltip } from "@/components/HelpTooltip";

const MEDAL = ["🥇", "🥈", "🥉"];

type SortField = "nome" | "horasTrabalhadas" | "taxaPresenca" | "kgPorHora" | "quebraPct" | "custoTotal" | "oeeMedio";
type SortDir = "asc" | "desc";

export default function InteligenciaOperacional() {
  const today = new Date();
  const [startDateStr, setStartDateStr] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDateStr, setEndDateStr] = useState(format(today, "yyyy-MM-dd"));
  const [repuxadorId, setRepuxadorId] = useState<number | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>("horasTrabalhadas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Temporários para o modal
  const [tempStart, setTempStart] = useState(startDateStr);
  const [tempEnd, setTempEnd] = useState(endDateStr);
  const [tempRepuxador, setTempRepuxador] = useState<string>("todos");

  const startDate = useMemo(() => new Date(startDateStr + "T00:00:00"), [startDateStr]);
  const endDate = useMemo(() => new Date(endDateStr + "T23:59:59"), [endDateStr]);

  const repuxadoresQuery = trpc.repuxadores.list.useQuery();

  const metricasQuery = trpc.inteligenciaOperacional.getMetricasOperadores.useQuery(
    {
      startDate,
      endDate,
      repuxadorId: repuxadorId ?? null,
    },
    { staleTime: 30000 }
  );

  const { metricas = [], resumo, politica } = metricasQuery.data ?? {};

  // Ordenação das métricas
  const metricasOrdenadas = useMemo(() => {
    return [...metricas].sort((a, b) => {
      let va: number | string = a[sortField] ?? 0;
      let vb: number | string = b[sortField] ?? 0;
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [metricas, sortField, sortDir]);

  const totalAlertas = metricas.reduce((acc, m) => acc + m.alertas.length, 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-slate-400 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-indigo-500 ml-1 inline" />
      : <ChevronDown size={12} className="text-indigo-500 ml-1 inline" />;
  };

  const handleOpenFilter = () => {
    setTempStart(startDateStr);
    setTempEnd(endDateStr);
    setTempRepuxador(repuxadorId ? String(repuxadorId) : "todos");
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setStartDateStr(tempStart);
    setEndDateStr(tempEnd);
    setRepuxadorId(tempRepuxador === "todos" ? undefined : Number(tempRepuxador));
    setIsFilterOpen(false);
  };

  const isLoading = metricasQuery.isLoading;

  // Formatação de horas
  const fmtH = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h${String(mins).padStart(2, "0")}min`;
  };

  const fmtR$ = (v: number | null | undefined) =>
    v !== null && v !== undefined
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <Zap className="text-violet-500" />
            Inteligência Operacional
          </h1>
          <p className="text-muted-foreground mt-1">
            Jornada de trabalho, produtividade, custo e presença por operador
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Atalhos de período */}
          {[
            { label: "7 dias", days: 7 },
            { label: "30 dias", days: 30 },
            { label: "90 dias", days: 90 },
          ].map(({ label, days }) => {
            const s = format(subDays(today, days), "yyyy-MM-dd");
            const e = format(today, "yyyy-MM-dd");
            const active = startDateStr === s && endDateStr === e;
            return (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className={`h-8 text-xs ${active ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 hover:text-white font-semibold" : "text-slate-600 border-slate-200"}`}
                onClick={() => { setStartDateStr(s); setEndDateStr(e); }}
              >
                {label}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs border-slate-200"
            onClick={handleOpenFilter}
          >
            <SlidersHorizontal size={13} className="text-violet-500" />
            Filtros
            {(repuxadorId !== undefined) && (
              <span className="flex h-2 w-2 rounded-full bg-violet-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Info da Política Vigente */}
      {politica && (
        <div className="flex flex-wrap items-center gap-3 bg-violet-50 border border-violet-100 rounded-lg px-4 py-2.5 text-xs text-violet-700 font-medium">
          <Calendar size={14} className="text-violet-500" />
          <span className="font-semibold">Política Vigente:</span>
          <span>{politica.descricao}</span>
          <span className="text-violet-400">|</span>
          <span>
            Seg–Qui: {politica.manhaInicio}–{politica.manhaFim} / {politica.tardeInicio}–{politica.tardeFimSegQui}
          </span>
          <span className="text-violet-400">|</span>
          <span>
            Sex: {politica.manhaInicio}–{politica.manhaFim} / {politica.tardeInicio}–{politica.tardeFimSex}
          </span>
          {politica.custoHoraReais && (
            <>
              <span className="text-violet-400">|</span>
              <span>Custo/hora: {Number(politica.custoHoraReais).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-24 text-muted-foreground">Calculando métricas de jornada...</div>
      ) : !resumo ? (
        <div className="text-center py-24 text-muted-foreground">
          <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-slate-500">Nenhuma política de jornada configurada</p>
          <p className="text-sm mt-1">Acesse <strong>Gerenciar Cadastros → Política de Jornada</strong> para configurar os horários da fábrica.</p>
        </div>
      ) : (
        <>
          {/* KPIs Gerais do Período */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Horas Disponíveis
                      <HelpTooltip content="Total de horas que a fábrica poderia produzir no período, conforme a política de jornada configurada (por operador)." />
                    </p>
                    <h3 className="text-2xl font-bold text-violet-600 mt-1">
                      {fmtH(resumo.horasDisponiveisTotais)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{resumo.diasUteisPeriodo} dias úteis</p>
                  </div>
                  <div className="h-10 w-10 bg-violet-50 rounded-full flex items-center justify-center text-violet-500">
                    <Calendar size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] text-slate-500">
                  {fmtH(resumo.horasDisponiveisPorDia)}/dia por operador
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Horas Trabalhadas
                      <HelpTooltip content="Soma das horas efetivamente registradas em lançamentos de produção por todos os operadores." />
                    </p>
                    <h3 className="text-2xl font-bold text-indigo-600 mt-1">
                      {fmtH(resumo.totalHorasTrabalhadasEquipe)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{resumo.totalOperadoresAtivos} operadores</p>
                  </div>
                  <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] text-slate-500">
                  Equipe completa no período
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Presença Média
                      <HelpTooltip content="Média da taxa de presença de todos os operadores no período: horas trabalhadas / horas disponíveis × 100." />
                    </p>
                    <h3 className={`text-2xl font-bold mt-1 ${resumo.taxaPresencaMedia >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                      {resumo.taxaPresencaMedia}%
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Meta: ≥80%</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${resumo.taxaPresencaMedia >= 80 ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>
                    <Users size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] leading-normal flex items-center justify-between">
                  <span className="text-slate-500">Equipe no período</span>
                  {resumo.taxaPresencaMedia >= 80 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">DENTRO DA META</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[9px] border border-amber-200">ABAIXO DA META</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Custo Total
                      <HelpTooltip content="Custo total de mão de obra no período. Calculado como: horas trabalhadas × custo/hora configurado na política de jornada." />
                    </p>
                    <h3 className="text-2xl font-bold text-slate-700 mt-1">
                      {fmtR$(resumo.custoTotalEquipe)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{resumo.totalKgEquipe.toLocaleString("pt-BR")} kg produzidos</p>
                  </div>
                  <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] text-slate-500">
                  {resumo.custoTotalEquipe && resumo.totalKgEquipe > 0
                    ? `Custo/kg: ${fmtR$(resumo.custoTotalEquipe / resumo.totalKgEquipe)}`
                    : "Configure custo/hora na política de jornada"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas Automáticos */}
          {totalAlertas > 0 && (
            <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Alertas Operacionais
                  <Badge className="bg-amber-500 text-white text-xs ml-1">{totalAlertas}</Badge>
                </CardTitle>
                <CardDescription className="text-amber-600 text-xs">Operadores com indicadores fora da meta</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {metricas
                    .filter(m => m.alertas.length > 0)
                    .map(m => (
                      <div key={m.id} className="flex flex-col gap-1">
                        {m.alertas.map((alerta, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs bg-white/70 border border-amber-100 rounded-md px-3 py-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: m.cor || "#6366f1" }}
                            />
                            <span className="font-semibold text-slate-700">{m.nome}:</span>
                            <span className="text-amber-700">{alerta}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalAlertas === 0 && metricas.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-700 font-medium">
              <CheckCircle size={15} className="text-emerald-500" />
              Todos os operadores estão dentro das metas no período selecionado!
            </div>
          )}

          {/* Ranking Detalhado de Operadores */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 py-4">
                <Award className="text-yellow-500" />
                Ranking Detalhado de Operadores
                <HelpTooltip content="Tabela completa com métricas de jornada, produtividade e custo por operador. Clique nos cabeçalhos para ordenar." />
              </CardTitle>
              <CardDescription>Horas, presença, produtividade, quebra e custo por operador no período</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {metricasOrdenadas.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Nenhum dado de produção no período selecionado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("nome")}
                        >
                          Operador <SortIcon field="nome" />
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("horasTrabalhadas")}
                        >
                          H. Trabalhadas <SortIcon field="horasTrabalhadas" />
                        </TableHead>
                        <TableHead className="text-right">H. Disponíveis</TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("taxaPresenca")}
                        >
                          Presença <SortIcon field="taxaPresenca" />
                        </TableHead>
                        <TableHead className="text-right">Dias Trab.</TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("kgPorHora")}
                        >
                          kg/hora <SortIcon field="kgPorHora" />
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("oeeMedio")}
                        >
                          OEE <SortIcon field="oeeMedio" />
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("quebraPct")}
                        >
                          Quebra <SortIcon field="quebraPct" />
                        </TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-slate-100 select-none"
                          onClick={() => handleSort("custoTotal")}
                        >
                          Custo Total <SortIcon field="custoTotal" />
                        </TableHead>
                        <TableHead className="text-right">Custo/kg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricasOrdenadas.map((m, index) => (
                        <TableRow
                          key={m.id}
                          className={m.alertas.length > 0 ? "bg-amber-50/30 hover:bg-amber-50/60" : ""}
                        >
                          <TableCell className="font-semibold text-slate-500 text-xs">
                            {index < 3 ? MEDAL[index] : `#${index + 1}`}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full shrink-0 border border-slate-200"
                                style={{ backgroundColor: m.cor || "#6366f1" }}
                              />
                              <span className="font-semibold text-slate-800">{m.nome}</span>
                              {m.alertas.length > 0 && (
                                <AlertTriangle size={12} className="text-amber-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-indigo-600">
                            {fmtH(m.horasTrabalhadas)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 text-xs">
                            {fmtH(m.horasDisponiveis)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold text-sm ${m.taxaPresenca >= 80 ? "text-emerald-600" : m.taxaPresenca >= 60 ? "text-amber-500" : "text-red-500"}`}>
                              {m.taxaPresenca}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-slate-600 text-xs">
                            <span className="font-semibold">{m.diasTrabalhados}</span>
                            <span className="text-slate-400">/{m.diasUteisPeriodo}</span>
                            {m.diasAusentes > 0 && (
                              <span className="ml-1 text-amber-500 text-[10px]">
                                ({m.diasAusentes} aus.)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-violet-600">
                            {m.kgPorHora > 0 ? `${m.kgPorHora} kg/h` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${m.oeeMedio >= 75 ? "text-emerald-600" : m.oeeMedio >= 50 ? "text-amber-500" : "text-red-500"}`}>
                              {m.oeeMedio}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${m.quebraPct <= 2.5 ? "text-emerald-600" : "text-red-500"}`}>
                              {m.quebraPct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-slate-700 font-semibold">
                            {fmtR$(m.custoTotal)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 text-xs">
                            {m.custoPorKg !== null
                              ? m.custoPorKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legenda de presença */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Presença ≥80% (OK)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Presença 60–79% (atenção)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Presença &lt;60% (crítico)
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <AlertTriangle size={12} className="text-amber-500" />
              Indicador fora da meta
            </div>
          </div>
        </>
      )}

      {/* Modal de Filtros */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-violet-500" />
              Filtrar Inteligência Operacional
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-600">Período de Análise</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-slate-400 block mb-0.5">Data Início</Label>
                  <Input
                    type="date"
                    value={tempStart}
                    onChange={e => setTempStart(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <span className="text-slate-400 text-xs mt-4">até</span>
                <div className="flex-1">
                  <Label className="text-[10px] text-slate-400 block mb-0.5">Data Fim</Label>
                  <Input
                    type="date"
                    value={tempEnd}
                    onChange={e => setTempEnd(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-600">Operador</Label>
              <Select value={tempRepuxador} onValueChange={setTempRepuxador}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os operadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos os operadores</SelectItem>
                  {repuxadoresQuery.data?.map(r => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyFilter}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
            >
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
