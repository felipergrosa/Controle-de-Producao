import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Activity
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardRepuxo() {
  const today = new Date();
  const past30Days = subDays(today, 30);
  
  const [startDateStr, setStartDateStr] = useState(format(past30Days, "yyyy-MM-dd"));
  const [endDateStr, setEndDateStr] = useState(format(today, "yyyy-MM-dd"));

  const startDate = useMemo(() => new Date(startDateStr + "T00:00:00"), [startDateStr]);
  const endDate = useMemo(() => new Date(endDateStr + "T23:59:59"), [endDateStr]);

  // Query de Estatísticas Gerais
  const statsQuery = trpc.repuxados.getStats.useQuery({
    startDate,
    endDate
  }, {
    staleTime: 30000 // Cache 30 segundos
  });

  const stats = statsQuery.data;

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
        
        {/* Filtro de Período */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Atalhos de período */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
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
              className="h-8 text-xs"
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
              className="h-8 text-xs"
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
              className="h-8 text-xs"
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
              className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              onClick={() => {
                setStartDateStr("2024-01-01");
                setEndDateStr(format(today, "yyyy-MM-dd"));
              }}
            >
              Tudo
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-background border rounded-lg p-2 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date" 
              value={startDateStr} 
              onChange={(e) => setStartDateStr(e.target.value)}
              className="border-0 shadow-none h-8 w-36 focus-visible:ring-0 cursor-pointer"
            />
            <span className="text-muted-foreground text-xs font-semibold">até</span>
            <Input 
              type="date" 
              value={endDateStr} 
              onChange={(e) => setEndDateStr(e.target.value)}
              className="border-0 shadow-none h-8 w-36 focus-visible:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="text-center py-24 text-muted-foreground">Carregando painel de indicadores...</div>
      ) : !stats ? (
        <div className="text-center py-24 text-muted-foreground">Erro ao carregar dados do painel</div>
      ) : (
        <>
          {/* Grid de KPIs Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume de Produção</p>
                  <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalKgProduzido.toLocaleString('pt-BR')} kg</h3>
                  <p className="text-xs text-muted-foreground mt-1">({stats.totalPecasProduzidas.toLocaleString('pt-BR')} pçs)</p>
                </div>
                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                  <Scale size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Refugado</p>
                  <h3 className="text-2xl font-bold text-red-500 mt-1">{stats.totalKgQuebrado.toLocaleString('pt-BR')} kg</h3>
                  <p className="text-xs text-muted-foreground mt-1">({stats.totalPecasQuebradas.toLocaleString('pt-BR')} pçs)</p>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quebra Geral (%)</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.pctQuebraMedia}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">Média do período</p>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <Percent size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OEE Médio</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.oeeGeral.oee.toFixed(1)}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">Performance geral</p>
                </div>
                <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                  <TrendingUp size={20} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção OEE Gauge & Tendência Diária */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* OEE Componentes */}
            <Card className="lg:col-span-4 border border-border/60 shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg">Eficiência OEE Geral</CardTitle>
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
                <CardTitle className="text-lg">Tendência Diária de Produção & Perdas</CardTitle>
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
                <CardTitle className="text-lg">Pareto de Causas de Quebra</CardTitle>
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
                </CardTitle>
                <CardDescription>Produtividade, refugo e eficiência OEE por operador</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {stats.rankingRepuxadores.length === 0 ? (
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
                        {stats.rankingRepuxadores.map((r: any, index: number) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-semibold flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                              {r.nome}
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
        </>
      )}
    </div>
  );
}
