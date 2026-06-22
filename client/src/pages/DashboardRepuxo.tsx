import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  RadialBarChart, 
  RadialBar 
} from "recharts";
import { 
  TrendingUp, 
  Scale, 
  Percent, 
  Clock, 
  Award, 
  AlertTriangle, 
  Calendar, 
  CheckCircle,
  FileText,
  Activity,
  Filter,
  X,
  SlidersHorizontal,
  Check,
  ChevronsUpDown,
  ArrowUpDown
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import { HelpTooltip } from "@/components/HelpTooltip";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardRepuxo() {
  const today = new Date();
  const past30Days = subDays(today, 30);
  
  const [startDateStr, setStartDateStr] = useState(format(past30Days, "yyyy-MM-dd"));
  const [endDateStr, setEndDateStr] = useState(format(today, "yyyy-MM-dd"));

  const startDate = useMemo(() => new Date(startDateStr + "T00:00:00"), [startDateStr]);
  const endDate = useMemo(() => new Date(endDateStr + "T23:59:59"), [endDateStr]);

  // Estados para filtros aplicados
  const [repuxadorId, setRepuxadorId] = useState<number | undefined>(undefined);
  const [turno, setTurno] = useState<string | undefined>(undefined);
  const [causaQuebraId, setCausaQuebraId] = useState<number | undefined>(undefined);
  const [motivoParadaId, setMotivoParadaId] = useState<number | undefined>(undefined);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);

  // Estados temporários para o modal de filtros
  const [tempStartDateStr, setTempStartDateStr] = useState(startDateStr);
  const [tempEndDateStr, setTempEndDateStr] = useState(endDateStr);
  const [tempRepuxadorId, setTempRepuxadorId] = useState<string>("todos");
  const [tempTurno, setTempTurno] = useState<string>("todos");
  const [tempCausaQuebraId, setTempCausaQuebraId] = useState<string>("todos");
  const [tempMotivoParadaId, setTempMotivoParadaId] = useState<string>("todos");
  const [tempProductId, setTempProductId] = useState<string>("todos");
  const [tempSortBy, setTempSortBy] = useState<string>("producao_desc");

  // Estado para controlar abertura do modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [searchProduto, setSearchProduto] = useState("");

  // Estado para ordenação local da tabela de Produtos
  const [rankingProdutosSort, setRankingProdutosSort] = useState<{ field: string, order: "asc" | "desc" }>({ field: "totalKg", order: "desc" });

  // Queries de suporte para popular os filtros
  const repuxadoresQuery = trpc.repuxadores.list.useQuery();
  const turnosQuery = trpc.turnos.list.useQuery();
  const causasQuery = trpc.causasQuebra.list.useQuery();
  const motivosParadaQuery = trpc.motivosParada.list.useQuery();
  const produtosQuery = trpc.products.list.useQuery();

  // Query de Estatísticas Gerais com Filtros Aplicados
  const statsQuery = trpc.repuxados.getStats.useQuery({
    startDate,
    endDate,
    repuxadorId: repuxadorId ?? null,
    turno: turno ?? null,
    causaQuebraId: causaQuebraId ?? null,
    motivoParadaId: motivoParadaId ?? null,
    productId: productId ?? null,
    sortBy: sortBy ?? null,
  }, {
    staleTime: 30000 // Cache 30 segundos
  });

  const stats = statsQuery.data ? {
    ...statsQuery.data,
    rankingProdutos: statsQuery.data.rankingProdutos || [],
    rankingRepuxadores: statsQuery.data.rankingRepuxadores || [],
    paretoCausas: statsQuery.data.paretoCausas || [],
    evolucaoDiaria: statsQuery.data.evolucaoDiaria || [],
    oeeGeral: statsQuery.data.oeeGeral || { disponibilidade: 100, performance: 100, qualidade: 100, oee: 100 },
  } : undefined;

  const hasActiveFilters = repuxadorId !== undefined || turno !== undefined || causaQuebraId !== undefined || motivoParadaId !== undefined || productId !== undefined || (sortBy !== undefined && sortBy !== "producao_desc");

  const activePeriod = useMemo(() => {
    const todayStr = format(today, "yyyy-MM-dd");
    const past30DaysStr = format(subDays(today, 30), "yyyy-MM-dd");
    
    if (startDateStr === past30DaysStr && endDateStr === todayStr) {
      return "30dias";
    }
    if (startDateStr === "2024-01-01" && endDateStr === "2024-12-31") {
      return "2024";
    }
    if (startDateStr === "2025-01-01" && endDateStr === "2025-12-31") {
      return "2025";
    }
    if (startDateStr === "2026-01-01" && endDateStr === todayStr) {
      return "2026";
    }
    if (startDateStr === "2024-01-01" && endDateStr === todayStr) {
      return "tudo";
    }
    return "custom";
  }, [startDateStr, endDateStr, today]);

  const getShortcutClass = (period: string) => {
    return activePeriod === period
      ? "h-8 text-xs bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:text-white font-semibold shadow-sm"
      : "h-8 text-xs text-slate-600 hover:text-slate-800 bg-background hover:bg-slate-50 border-slate-200";
  };

  const handleOpenFilters = () => {
    setTempStartDateStr(startDateStr);
    setTempEndDateStr(endDateStr);
    setTempRepuxadorId(repuxadorId !== undefined ? String(repuxadorId) : "todos");
    setTempTurno(turno || "todos");
    setTempCausaQuebraId(causaQuebraId !== undefined ? String(causaQuebraId) : "todos");
    setTempMotivoParadaId(motivoParadaId !== undefined ? String(motivoParadaId) : "todos");
    setTempProductId(productId || "todos");
    setTempSortBy(sortBy || "producao_desc");
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setStartDateStr(tempStartDateStr);
    setEndDateStr(tempEndDateStr);
    setRepuxadorId(tempRepuxadorId === "todos" ? undefined : Number(tempRepuxadorId));
    setTurno(tempTurno === "todos" ? undefined : tempTurno);
    setCausaQuebraId(tempCausaQuebraId === "todos" ? undefined : Number(tempCausaQuebraId));
    setMotivoParadaId(tempMotivoParadaId === "todos" ? undefined : Number(tempMotivoParadaId));
    setProductId(tempProductId === "todos" ? undefined : tempProductId);
    setSortBy(tempSortBy);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const defaultStart = format(subDays(today, 30), "yyyy-MM-dd");
    const defaultEnd = format(today, "yyyy-MM-dd");
    setStartDateStr(defaultStart);
    setEndDateStr(defaultEnd);
    setTempStartDateStr(defaultStart);
    setTempEndDateStr(defaultEnd);

    setRepuxadorId(undefined);
    setTurno(undefined);
    setCausaQuebraId(undefined);
    setMotivoParadaId(undefined);
    setProductId(undefined);
    setSortBy(undefined);
    
    setTempRepuxadorId("todos");
    setTempTurno("todos");
    setTempCausaQuebraId("todos");
    setTempMotivoParadaId("todos");
    setTempProductId("todos");
    setTempSortBy("producao_desc");
    
    setIsFilterModalOpen(false);
  };

  // Formatar dados para Pareto (curva acumulada)
  const paretoData = useMemo(() => {
    if (!stats?.paretoCausas || stats.paretoCausas.length === 0) return [];
    
    const totalPecasQuebradas = stats.totalPecasQuebradas || 1;
    let somaAcumulada = 0;
    
    return stats.paretoCausas.map((c: any) => {
      somaAcumulada += c.pecas;
      const pctAcumulado = (somaAcumulada / totalPecasQuebradas) * 100;
      return {
        causa: c.causa,
        pecas: c.pecas,
        pesoKg: c.pesoKg,
        acumulado: Number(pctAcumulado.toFixed(1))
      };
    });
  }, [stats]);

  const sortedRankingProdutos = useMemo(() => {
    if (!stats?.rankingProdutos) return [];
    return [...stats.rankingProdutos].sort((a, b) => {
      const field = rankingProdutosSort.field;
      const order = rankingProdutosSort.order === "asc" ? 1 : -1;
      
      let aVal = a[field];
      let bVal = b[field];
      
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });
  }, [stats?.rankingProdutos, rankingProdutosSort]);

  const handleSortRankingProdutos = (field: string) => {
    setRankingProdutosSort(prev => ({
      field,
      order: prev.field === field && prev.order === "desc" ? "asc" : "desc"
    }));
  };

  const produtosFiltrados = useMemo(() => {
    if (!produtosQuery.data) return [];
    if (!searchProduto) return produtosQuery.data.slice(0, 10);
    const term = searchProduto.trim().toLowerCase();
    return produtosQuery.data.filter(p => 
      p.code.toLowerCase().includes(term) || 
      p.description.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [produtosQuery.data, searchProduto]);

  // Formatar dados OEE para o gráfico radial/gauge
  const oeeGaugeData = useMemo(() => {
    if (!stats?.oeeGeral) return [];
    return [
      { name: "OEE", value: Number(stats.oeeGeral.oee.toFixed(1)), fill: "#6366f1" },
      { name: "Qualidade", value: Number(stats.oeeGeral.qualidade.toFixed(1)), fill: "#10b981" },
      { name: "Performance", value: Number(stats.oeeGeral.performance.toFixed(1)), fill: "#f59e0b" },
      { name: "Disponibilidade", value: Number(stats.oeeGeral.disponibilidade.toFixed(1)), fill: "#06b6d4" },
    ];
  }, [stats]);

  if (typeof window !== "undefined") {
    (window as any)._dashboard_handlers = {
      handleOpenFilters,
      handleApplyFilters,
      handleClearFilters
    };
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="text-indigo-500" />
            Dashboard de Repuxo
          </h1>
          <p className="text-muted-foreground mt-1">Análise geral de produtividade, eficiência OEE e indicadores de refugo</p>
        </div>
        
        {/* Filtro de Período e Filtros Avançados */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Atalhos de período */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className={getShortcutClass("30dias")}
              onClick={() => {
                setStartDateStr(format(subDays(today, 30), "yyyy-MM-dd"));
                setEndDateStr(format(today, "yyyy-MM-dd"));
              }}
            >
              30 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={getShortcutClass("2024")}
              onClick={() => {
                setStartDateStr("2024-01-01");
                setEndDateStr("2024-12-31");
              }}
            >
              2024
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={getShortcutClass("2025")}
              onClick={() => {
                setStartDateStr("2025-01-01");
                setEndDateStr("2025-12-31");
              }}
            >
              2025
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={getShortcutClass("2026")}
              onClick={() => {
                setStartDateStr("2026-01-01");
                setEndDateStr(format(today, "yyyy-MM-dd"));
              }}
            >
              2026
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={getShortcutClass("tudo")}
              onClick={() => {
                setStartDateStr("2024-01-01");
                setEndDateStr(format(today, "yyyy-MM-dd"));
              }}
            >
              Tudo
            </Button>
          </div>

          {/* Botão de Filtros Avançados */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenFilters}
              className="h-8 md:h-8 gap-2 text-slate-700 bg-background border border-slate-200 shadow-sm font-semibold hover:bg-slate-50 flex items-center px-4"
            >
              <SlidersHorizontal size={14} className="text-indigo-500" />
              <span className="text-xs">Filtros Avançados</span>
              {hasActiveFilters && (
                <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </Button>

            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Filter size={18} className="text-indigo-500 animate-bounce" />
                  Filtrar Dashboard
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Período de Análise (Range de Datas) */}
                <div className="grid gap-2 border-b pb-4">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
                    <Calendar size={14} className="text-indigo-500 animate-pulse" />
                    Período de Análise
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor="date-start" className="text-[10px] text-slate-400 block mb-0.5">Data Início</Label>
                      <Input 
                        id="date-start"
                        type="date" 
                        value={tempStartDateStr} 
                        onChange={(e) => setTempStartDateStr(e.target.value)}
                        className="h-9 text-xs cursor-pointer focus-visible:ring-indigo-500"
                      />
                    </div>
                    <span className="text-slate-400 text-xs mt-4 font-medium">até</span>
                    <div className="flex-1">
                      <Label htmlFor="date-end" className="text-[10px] text-slate-400 block mb-0.5">Data Fim</Label>
                      <Input 
                        id="date-end"
                        type="date" 
                        value={tempEndDateStr} 
                        onChange={(e) => setTempEndDateStr(e.target.value)}
                        className="h-9 text-xs cursor-pointer focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                {/* Operador */}
                <div className="grid gap-2">
                  <Label htmlFor="operador" className="text-xs font-semibold text-slate-600">Operador / Repuxador</Label>
                  <Select value={tempRepuxadorId} onValueChange={setTempRepuxadorId}>
                    <SelectTrigger id="operador" className="w-full text-xs h-9">
                      <SelectValue placeholder="Selecione um operador" />
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

                {/* Turno */}
                <div className="grid gap-2">
                  <Label htmlFor="turno" className="text-xs font-semibold text-slate-600">Turno</Label>
                  <Select value={tempTurno} onValueChange={setTempTurno}>
                    <SelectTrigger id="turno" className="w-full text-xs h-9">
                      <SelectValue placeholder="Selecione um turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs">Todos os turnos</SelectItem>
                      {turnosQuery.data?.map(t => (
                        <SelectItem key={t.id} value={t.codigo} className="text-xs">
                          {t.descricao} ({t.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Causa da Quebra */}
                <div className="grid gap-2">
                  <Label htmlFor="causaQuebra" className="text-xs font-semibold text-slate-600">Causa da Quebra (Refugo)</Label>
                  <Select value={tempCausaQuebraId} onValueChange={setTempCausaQuebraId}>
                    <SelectTrigger id="causaQuebra" className="w-full text-xs h-9">
                      <SelectValue placeholder="Selecione uma causa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs">Todas as causas</SelectItem>
                      {causasQuery.data?.map(c => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                          {c.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Motivo de Parada */}
                <div className="grid gap-2">
                  <Label htmlFor="motivoParada" className="text-xs font-semibold text-slate-600">Motivo de Parada de Máquina</Label>
                  <Select value={tempMotivoParadaId} onValueChange={setTempMotivoParadaId}>
                    <SelectTrigger id="motivoParada" className="w-full text-xs h-9">
                      <SelectValue placeholder="Selecione um motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs">Todos os motivos</SelectItem>
                      {motivosParadaQuery.data?.map(m => (
                        <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                          {m.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Produto */}
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-slate-600">Produto</Label>
                  <Popover open={produtoOpen} onOpenChange={setProdutoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={produtoOpen}
                        className="w-full justify-between font-normal text-xs h-9 bg-background px-3"
                      >
                        <span className="truncate">
                          {tempProductId && tempProductId !== "todos"
                            ? (() => {
                                const p = produtosQuery.data?.find((prod) => prod.id === tempProductId);
                                return p ? `${p.code} - ${p.description}` : "Selecione...";
                              })()
                            : "Todos os produtos"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Buscar por código ou descrição..." 
                          className="h-9 text-xs" 
                          value={searchProduto}
                          onValueChange={setSearchProduto}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup className="max-h-[150px] overflow-auto">
                            <CommandItem
                              value="todos"
                              onSelect={() => {
                                setTempProductId("todos");
                                setProdutoOpen(false);
                                setSearchProduto("");
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", tempProductId === "todos" ? "opacity-100" : "opacity-0")}
                              />
                              Todos os produtos
                            </CommandItem>
                            {produtosFiltrados.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.code} ${p.description}`}
                                onSelect={() => {
                                  setTempProductId(p.id);
                                  setProdutoOpen(false);
                                  setSearchProduto("");
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    tempProductId === p.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {p.code} - {p.description}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Ordenação do Ranking */}
                <div className="grid gap-2">
                  <Label htmlFor="sortBy" className="text-xs font-semibold text-slate-600">Ordenar Ranking de Operadores por</Label>
                  <Select value={tempSortBy} onValueChange={setTempSortBy}>
                    <SelectTrigger id="sortBy" className="w-full text-xs h-9">
                      <SelectValue placeholder="Escolha a ordenação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao_desc" className="text-xs">Maior Produção (KG)</SelectItem>
                      <SelectItem value="producao_asc" className="text-xs">Menor Produção (KG)</SelectItem>
                      <SelectItem value="pecas_desc" className="text-xs">Maior Quantidade (Pçs)</SelectItem>
                      <SelectItem value="pecas_asc" className="text-xs">Menor Quantidade (Pçs)</SelectItem>
                      <SelectItem value="oee_desc" className="text-xs">Maior Eficiência OEE</SelectItem>
                      <SelectItem value="quebra_desc" className="text-xs">Maior Taxa de Quebra (%)</SelectItem>
                      <SelectItem value="quebra_asc" className="text-xs">Menor Taxa de Quebra (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-red-500 hover:text-red-700 font-semibold text-xs">
                  Limpar Filtros
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFilterModalOpen(false)} className="text-xs h-9">
                    Cancelar
                  </Button>
                  <Button variant="default" size="sm" onClick={handleApplyFilters} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9">
                    Aplicar Filtros
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>



      {/* Badges de Filtros Ativos */}
      {(hasActiveFilters || activePeriod === "custom") && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 border border-slate-200/50 p-3 rounded-lg text-xs shadow-sm">
          <span className="font-semibold text-slate-600">Filtros ativos:</span>
          {activePeriod === "custom" && (
            <Badge variant="secondary" className="gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Período: {format(new Date(startDateStr + "T00:00:00"), "dd/MM/yyyy")} até {format(new Date(endDateStr + "T00:00:00"), "dd/MM/yyyy")}
              <button onClick={() => {
                const defaultStart = format(subDays(today, 30), "yyyy-MM-dd");
                const defaultEnd = format(today, "yyyy-MM-dd");
                setStartDateStr(defaultStart);
                setEndDateStr(defaultEnd);
                setTempStartDateStr(defaultStart);
                setTempEndDateStr(defaultEnd);
              }} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {repuxadorId !== undefined && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Operador: {repuxadoresQuery.data?.find(r => r.id === repuxadorId)?.nome || repuxadorId}
              <button onClick={() => setRepuxadorId(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {turno !== undefined && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Turno: {turno}
              <button onClick={() => setTurno(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {causaQuebraId !== undefined && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Causa Quebra: {causasQuery.data?.find(c => c.id === causaQuebraId)?.descricao || causaQuebraId}
              <button onClick={() => setCausaQuebraId(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {motivoParadaId !== undefined && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Motivo Parada: {motivosParadaQuery.data?.find(m => m.id === motivoParadaId)?.descricao || motivoParadaId}
              <button onClick={() => setMotivoParadaId(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {productId !== undefined && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Produto: {produtosQuery.data?.find(p => p.id === productId)?.code || productId}
              <button onClick={() => setProductId(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          {sortBy !== undefined && sortBy !== "producao_desc" && (
            <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 shadow-sm text-[10px]">
              Ordenado por: {
                sortBy === "producao_asc" ? "Menor Produção (KG)" :
                sortBy === "pecas_desc" ? "Maior Qtd (Pçs)" :
                sortBy === "pecas_asc" ? "Menor Qtd (Pçs)" :
                sortBy === "oee_desc" ? "Maior OEE" :
                sortBy === "quebra_desc" ? "Maior Quebra (%)" :
                sortBy === "quebra_asc" ? "Menor Quebra (%)" : sortBy
              }
              <button onClick={() => setSortBy(undefined)} className="hover:text-red-500 font-bold ml-1 text-xs">×</button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold h-7 px-2.5 text-[11px] ml-auto">
            Limpar todos
          </Button>
        </div>
      )}

      {statsQuery.isLoading ? (
        <div className="text-center py-24 text-muted-foreground">Carregando painel de indicadores...</div>
      ) : !stats ? (
        <div className="text-center py-24 text-muted-foreground">Erro ao carregar dados do painel</div>
      ) : (
        <>
          {/* Grid de KPIs Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4 py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                      Volume de Produção
                      <HelpTooltip content="Peso total em KG de todas as peças repuxadas que foram registradas no período selecionado." />
                    </p>
                    <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalKgProduzido.toLocaleString('pt-BR')} kg</h3>
                    <p className="text-xs text-slate-500 mt-1">({stats.totalPecasProduzidas.toLocaleString('pt-BR')} pçs)</p>
                  </div>
                  <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                    <Scale size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] text-slate-500 leading-normal">
                  Total de <strong>{stats.totalLancamentos ?? 0}</strong> lotes de produção apontados neste período.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4 py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                      Total Refugado
                      <HelpTooltip content="Peso total em KG de todas as peças perdidas (por quebras ou defeitos) no período selecionado." />
                    </p>
                    <h3 className="text-2xl font-bold text-red-500 mt-1">{stats.totalKgQuebrado.toLocaleString('pt-BR')} kg</h3>
                    <p className="text-xs text-slate-500 mt-1">({stats.totalPecasQuebradas.toLocaleString('pt-BR')} pçs)</p>
                  </div>
                  <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 text-[10px] text-slate-500 leading-normal">
                  Representa <strong>{((stats.totalKgQuebrado / (stats.totalKgProduzido || 1)) * 100).toFixed(2)}%</strong> do peso total produzido.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4 py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                      Quebra Geral (%)
                      <HelpTooltip content="Percentual médio de desperdício em relação ao total produzido no período. Fórmula: (Peças Quebradas / Peças Produzidas) * 100." />
                    </p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.pctQuebraMedia}%</h3>
                    <p className="text-xs text-slate-500 mt-1">Média do período</p>
                  </div>
                  <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <Percent size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 flex items-center justify-between text-[10px] leading-normal">
                  <span className="text-slate-500">Meta: <strong>&lt;= 2.50%</strong></span>
                  {stats.pctQuebraMedia <= 2.5 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">DENTRO DA META</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[9px] border border-red-200">ACIMA DA META</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4 py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                      OEE Médio
                      <HelpTooltip content="Overall Equipment Effectiveness (Eficácia Geral de Equipamento). Avalia a produtividade medindo Disponibilidade, Performance e Qualidade." />
                    </p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.oeeGeral.oee.toFixed(1)}%</h3>
                    <p className="text-xs text-slate-500 mt-1">Performance geral</p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="border-t pt-2.5 mt-2.5 flex justify-between text-[10px] text-slate-500 font-medium leading-normal">
                  <span>Disp: <strong>{stats.oeeGeral.disponibilidade.toFixed(0)}%</strong></span>
                  <span>Perf: <strong>{stats.oeeGeral.performance.toFixed(0)}%</strong></span>
                  <span>Qual: <strong>{stats.oeeGeral.qualidade.toFixed(0)}%</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção OEE Gauge & Tendência Diária */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* OEE Componentes */}
            <Card className="lg:col-span-4 border border-border/60 shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  Eficiência OEE Geral
                  <HelpTooltip content="Métrica OEE geral e detalhamento de seus três pilares: Disponibilidade (tempo em que a máquina trabalhou), Performance (ritmo de produção comparado com a meta ideal por hora) e Qualidade (percentual de peças produzidas sem quebras ou defeitos)." />
                </CardTitle>
                <CardDescription>Visualização dos pilares do OEE</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="relative h-60 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="30%" 
                      outerRadius="100%" 
                      barSize={12} 
                      data={oeeGaugeData}
                    >
                      <RadialBar
                        label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                        background
                        dataKey="value"
                      />
                      <Tooltip formatter={(value) => `${value}%`} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-indigo-600">{stats.oeeGeral.oee.toFixed(1)}%</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OEE Geral</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 text-xs font-medium border-t pt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-cyan-500" />
                    <span>Disponibilidade: <strong>{stats.oeeGeral.disponibilidade.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span>Performance: <strong>{stats.oeeGeral.performance.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Qualidade: <strong>{stats.oeeGeral.qualidade.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-indigo-500" />
                    <span>OEE: <strong>{stats.oeeGeral.oee.toFixed(1)}%</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evolução Diária */}
            <Card className="lg:col-span-8 border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  Tendência Diária de Produção & Perdas
                  <HelpTooltip content="Gráfico que apresenta a evolução diária do volume produzido (representado em KG no eixo esquerdo) comparado com a taxa percentual de desperdício/refugo (no eixo direito)." />
                </CardTitle>
                <CardDescription>Produção total em kg e taxa de refugo (%) por dia</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.evolucaoDiaria} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorQuebra" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="data" 
                        tickFormatter={(str) => {
                          try {
                            const [y, m, d] = str.split("-");
                            return `${d}/${m}`;
                          } catch {
                            return str;
                          }
                        }}
                      />
                      <YAxis yAxisId="left" label={{ value: 'KG Produzido', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Quebra (%)', angle: 90, position: 'insideRight' }} />
                      <Tooltip labelFormatter={(val) => `Data: ${val}`} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="kg" name="Peso Produzido (kg)" stroke="#6366f1" fillOpacity={1} fill="url(#colorKg)" />
                      <Area yAxisId="right" type="monotone" dataKey="quebraPct" name="Desperdício (%)" stroke="#ef4444" fillOpacity={1} fill="url(#colorQuebra)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pareto & Ranking Operadores */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pareto de Desperdício */}
            <Card className="lg:col-span-6 border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  Pareto de Causas de Quebra
                  <HelpTooltip content="Identifica as maiores causas de peças quebradas. O gráfico é classificado em ordem decrescente, permitindo priorizar ações corretivas nos problemas mais impactantes (Regra de Pareto 80/20)." />
                </CardTitle>
                <CardDescription>Identificação dos principais motivos de desperdício em peças</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {paretoData.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground text-sm">Nenhum desperdício registrado no período</div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="causa" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Peças Desperdiçadas', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar yAxisId="left" dataKey="pecas" name="Peças Quebradas" fill="#8b5cf6">
                          {paretoData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking Operadores */}
            <Card className="lg:col-span-6 border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="text-yellow-500" />
                  Desempenho por Repuxador
                  <HelpTooltip content="Classificação dos operadores por volume produzido em KG. Mostra também o percentual médio de quebras e o índice de eficiência OEE obtido por cada um deles no período." />
                </CardTitle>
                <CardDescription>Produtividade, refugo e eficiência OEE por operador</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
              {!stats?.rankingRepuxadores || stats.rankingRepuxadores.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">Nenhum registro de operador no período</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Operador</TableHead>
                        <TableHead className="text-right">Produção (kg)</TableHead>
                        <TableHead className="text-right">Quebras (%)</TableHead>
                        <TableHead className="text-right">OEE Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.rankingRepuxadores?.map((r: any, index: number) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-semibold flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                              <span 
                                className="h-2.5 w-2.5 rounded-full border border-slate-200 shrink-0" 
                                style={{ backgroundColor: r.cor || "#6366f1" }} 
                              />
                              <span className="text-slate-800">{r.nome}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium">{r.totalKg.toLocaleString('pt-BR')} kg</TableCell>
                            <TableCell className="text-right">
                              <span className={r.quebraPct > 2.5 ? "text-red-500 font-bold" : "text-emerald-500 font-semibold"}>
                                {r.quebraPct.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-indigo-600">{r.oeeMedio}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Produtos mais Repuxados */}
          <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="text-indigo-500" />
                Produtos mais Repuxados
                <HelpTooltip content="Classificação dos produtos por volume de produção em KG. Apresenta o código, descrição, total produzido (KG e peças) e a respectiva taxa de quebras do produto." />
              </CardTitle>
              <CardDescription>Visualização dos produtos com maior volume de produção e desperdício</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!stats?.rankingProdutos || stats.rankingProdutos.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">Nenhum registro de produto no período</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[80px]">Rank</TableHead>
                        <TableHead className="w-[120px] cursor-pointer hover:bg-slate-100 select-none group" onClick={() => handleSortRankingProdutos('code')}>
                          <div className="flex items-center gap-1">Código <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-slate-100 select-none group" onClick={() => handleSortRankingProdutos('description')}>
                          <div className="flex items-center gap-1">Descrição <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none group" onClick={() => handleSortRankingProdutos('totalKg')}>
                          <div className="flex items-center justify-end gap-1"><ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Produção (kg)</div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none group" onClick={() => handleSortRankingProdutos('totalPecas')}>
                          <div className="flex items-center justify-end gap-1"><ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Produção (pçs)</div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none group" onClick={() => handleSortRankingProdutos('quebraPct')}>
                          <div className="flex items-center justify-end gap-1"><ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Quebras (%)</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRankingProdutos.map((p: any, index: number) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-semibold">
                            <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{p.code}</TableCell>
                          <TableCell className="max-w-[300px] truncate font-medium text-slate-700" title={p.description}>
                            {p.description}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-indigo-600">
                            {p.totalKg.toLocaleString('pt-BR')} kg
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {p.totalPecas.toLocaleString('pt-BR')} pçs
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={p.quebraPct > 2.5 ? "text-red-500 font-bold" : "text-emerald-500 font-semibold"}>
                              {p.quebraPct.toFixed(2)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
