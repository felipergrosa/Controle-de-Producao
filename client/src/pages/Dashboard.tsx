import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { trpc } from "@/lib/trpc";
import { Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart3, Package, Calendar } from "lucide-react";
import { toast } from "sonner";

type PeriodType = "today" | "7days" | "30days" | "custom";

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date();
    if (period === "today") {
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "7days") {
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "30days") {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "custom") {
      if (!customStartDate || !customEndDate) {
        toast.error("Selecione as datas customizadas");
        return null;
      }
      startDate = new Date(customStartDate + "T00:00:00");
      endDate.setTime(new Date(customEndDate + "T23:59:59").getTime());
    }

    return { startDate, endDate };
  };

  const dateRange = getDateRange();

  // Queries
  const { data: stats } = trpc.analytics.getStats.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: dailyTrend = [] } = trpc.analytics.getDailyTrend.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: topProducts = [] } = trpc.analytics.getTopProducts.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 10 } : { startDate: new Date(), endDate: new Date(), limit: 10 },
    { enabled: !!dateRange }
  );

  const { data: checkRate } = trpc.analytics.getCheckRate.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: periodComparison } = trpc.analytics.getPeriodComparison.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: productiveDays } = trpc.analytics.getProductiveDays.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: abcAnalysis = [] } = trpc.analytics.getABCAnalysis.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: inactiveProductsData } = trpc.analytics.getInactiveProducts.useQuery(
    { days: 30 }
  );

  const inactiveProducts = inactiveProductsData?.products ?? [];
  const totalProductsCount = inactiveProductsData?.totalProducts ?? 0;
  const inactiveProductsCount = inactiveProductsData?.inactiveCount ?? inactiveProducts.length;

  const { data: alerts = [] } = trpc.analytics.getSystemAlerts.useQuery();

  const { data: checkRateTrend = [] } = trpc.analytics.getCheckRateTrend.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: weeklyHeatmap = [] } = trpc.analytics.getWeeklyHeatmap.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: variability = [] } = trpc.analytics.getProductVariability.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  const formatChange = (value: number) => {
    const formatted = value.toFixed(1);
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatted}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const handleExportCSV = () => {
    if (!stats) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const csvContent = [
      ["Métrica", "Valor", "Variação %"],
      ["Total Produzido", stats.totalQuantity || 0, periodComparison?.changes.totalQuantity?.toFixed(1) || "0"],
      ["Total de Itens", stats.totalItems || 0, periodComparison?.changes.totalItems?.toFixed(1) || "0"],
      ["Produtos Únicos", stats.uniqueProducts || 0, periodComparison?.changes.uniqueProducts?.toFixed(1) || "0"],
      ["Média por Dia", (stats.averagePerDay || 0).toFixed(2), periodComparison?.changes.averagePerDay?.toFixed(1) || "0"],
      ["Taxa de Conferência", `${(checkRate?.checkRate || 0).toFixed(1)}%`, ""],
      ["Dias Produtivos", `${productiveDays?.productiveDays || 0}/${productiveDays?.totalDays || 0}`, ""],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso");
  };

  const criticalAlerts = alerts.filter(a => a.type === 'critical');
  const warningAlerts = alerts.filter(a => a.type === 'warning');

  const metricCards = [
    {
      key: "totalProduced",
      title: "Total Produzido",
      value: stats?.totalQuantity ?? 0,
      formatter: (val: number) => val.toLocaleString("pt-BR"),
      subtitle: "unidades",
      change: periodComparison?.changes.totalQuantity,
      icon: BarChart3,
      iconClasses: "bg-primary/10 text-primary",
    },
    {
      key: "totalItems",
      title: "Total de Itens",
      value: stats?.totalItems ?? 0,
      formatter: (val: number) => val.toLocaleString("pt-BR"),
      subtitle: "lançamentos",
      change: periodComparison?.changes.totalItems,
      icon: Calendar,
      iconClasses: "bg-emerald-100 text-emerald-600",
    },
    {
      key: "uniqueProducts",
      title: "Produtos Únicos",
      value: stats?.uniqueProducts ?? 0,
      formatter: (val: number) => val.toLocaleString("pt-BR"),
      subtitle: "produtos",
      change: periodComparison?.changes.uniqueProducts,
      icon: Package,
      iconClasses: "bg-sky-100 text-sky-600",
    },
    {
      key: "averagePerDay",
      title: "Média por Dia",
      value: stats?.averagePerDay ?? 0,
      formatter: (val: number) =>
        val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      subtitle: "unidades/dia",
      change: periodComparison?.changes.averagePerDay,
      icon: Clock,
      iconClasses: "bg-amber-100 text-amber-600",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de KPI</h1>
          <p className="text-muted-foreground mt-2">Análise completa de produção e métricas</p>
        </div>

        <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Período
            </span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-44 md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Customizado</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download size={18} />
              Exportar
            </Button>
          </div>

          {period === "custom" && (
            <div className="flex w-full flex-wrap gap-3 md:justify-end">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs Principais com Comparação */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          const hasChange = typeof card.change === "number" && !Number.isNaN(card.change);
          const gradientClass = [
            "card-gradient-blue",
            "card-gradient-purple",
            "card-gradient-amber",
            "card-gradient-rose",
          ][index % 4];

          return (
            <Card
              key={card.key}
              className={`border-border/60 shadow-sm transition hover:shadow-md ${gradientClass}`}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.title}
                  </CardTitle>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.iconClasses}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-foreground">
                    {card.formatter(card.value)}
                  </span>
                  <span className="text-sm text-muted-foreground">{card.subtitle}</span>
                </div>
                {hasChange && (
                  <div className={`flex items-center gap-2 text-xs font-medium ${getChangeColor(card.change ?? 0)}`}>
                    <span className="flex items-center gap-1">
                      {getChangeIcon(card.change ?? 0)}
                      {formatChange(card.change ?? 0)}
                    </span>
                    <span className="text-muted-foreground">vs período anterior</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Taxa de Conferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold">{(checkRate?.checkRate || 0).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground mb-1">{checkRate?.checkedItems || 0}/{checkRate?.totalItems || 0}</p>
              </div>
              <Progress value={checkRate?.checkRate || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 95%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias Produtivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold">{productiveDays?.productiveDays || 0}</p>
                <p className="text-sm text-muted-foreground mb-1">de {productiveDays?.totalDays || 0} dias</p>
              </div>
              <Progress value={productiveDays?.rate || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">Taxa: {(productiveDays?.rate || 0).toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Info. Produtos
            </CardTitle>
            <CardDescription>
              Visão geral dos produtos cadastrados e daqueles com baixa movimentação (últimos 30 dias)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-3xl font-bold">
                  {totalProductsCount.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de produtos cadastrados
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-3xl font-bold">
                  {inactiveProductsCount.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Com baixa ou nenhuma atividade
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wide">
                Atenção necessária
              </Badge>
              <span className="text-xs text-muted-foreground">
                Acompanhe os produtos com pouca movimentação na aba Detalhes.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="abc">Análise ABC</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência Diária</CardTitle>
                <CardDescription>Produção e taxa de conferência por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="totalQuantity" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Quantidade" />
                    <Area type="monotone" dataKey="totalItems" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Itens" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Produtos</CardTitle>
                <CardDescription>Produtos mais produzidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="totalQuantity" fill="#3b82f6" name="Quantidade" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Check Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Conferência</CardTitle>
                <CardDescription>Taxa de conferência por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={checkRateTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="checkRate" stroke="#10b981" strokeWidth={2} name="Taxa %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Produtos</CardTitle>
                <CardDescription>Top 5 por proporção</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 5)}
                      dataKey="totalQuantity"
                      nameKey="code"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {topProducts.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="abc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise ABC (Pareto)</CardTitle>
              <CardDescription>Classificação de produtos por volume de produção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {abcAnalysis.filter((p: any) => p.classification === 'A').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Classe A (80%)</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">
                      {abcAnalysis.filter((p: any) => p.classification === 'B').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Classe B (15%)</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">
                      {abcAnalysis.filter((p: any) => p.classification === 'C').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Classe C (5%)</div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr>
                        <th className="text-left p-2">Classe</th>
                        <th className="text-left p-2">Código</th>
                        <th className="text-left p-2">Descrição</th>
                        <th className="text-right p-2">Quantidade</th>
                        <th className="text-right p-2">% Individual</th>
                        <th className="text-right p-2">% Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcAnalysis.map((product: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Badge 
                              variant={product.classification === 'A' ? 'default' : product.classification === 'B' ? 'secondary' : 'outline'}
                            >
                              {product.classification}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">{product.code}</td>
                          <td className="p-2 max-w-xs truncate">{product.description}</td>
                          <td className="p-2 text-right font-semibold">{product.totalQuantity}</td>
                          <td className="p-2 text-right">{product.percentage.toFixed(2)}%</td>
                          <td className="p-2 text-right">{product.accumulated.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Centro de Alertas */}
            {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Centro de Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {criticalAlerts.map((alert, idx) => (
                      <div key={`critical-${idx}`} className="flex items-center gap-2 text-sm p-2 bg-red-50 border border-red-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <span className="text-red-900">{alert.message}</span>
                      </div>
                    ))}
                    {warningAlerts.map((alert, idx) => (
                      <div key={`warning-${idx}`} className="flex items-center gap-2 text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-yellow-900">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Produtos Inativos */}
            <Card>
              <CardHeader>
                <CardTitle>Info. Produtos</CardTitle>
                <CardDescription>
                  Visão geral dos produtos cadastrados e daqueles com baixa movimentação (últimos 30 dias)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-3xl font-bold">
                      {totalProductsCount.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de produtos cadastrados
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-3xl font-bold">
                      {inactiveProductsCount.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Com baixa ou nenhuma atividade
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">Atenção necessária</Badge>
                  <span className="text-xs text-muted-foreground">
                    Lista abaixo exibe até 20 produtos mais recentes sem movimentação
                  </span>
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                  {inactiveProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Todos os produtos estão ativos
                    </p>
                  ) : (
                    inactiveProducts.slice(0, 20).map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-medium">{product.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="outline" className="text-xs">
                            {product.daysInactive != null ? `${product.daysInactive}d` : 'Nunca produzido'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Variabilidade */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Variabilidade de Produção</CardTitle>
                <CardDescription>Produtos com maior oscilação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {variability.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Dados insuficientes para análise
                    </p>
                  ) : (
                    variability
                      .sort((a, b) => b.coefficient - a.coefficient)
                      .slice(0, 15)
                      .map((product, idx) => (
                        <div key={idx} className="p-3 border rounded-lg text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-mono font-medium">{product.code}</p>
                            <Badge variant="outline">{product.coefficient.toFixed(0)}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Média: {product.avgQuantity.toFixed(0)}</span>
                            <span>Min: {product.minQuantity}</span>
                            <span>Máx: {product.maxQuantity}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
