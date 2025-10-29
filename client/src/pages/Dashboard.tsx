import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";
import { Download } from "lucide-react";
import { toast } from "sonner";

type PeriodType = "today" | "7days" | "30days" | "custom";

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    const endDate = new Date();

    let startDate = new Date();
    if (period === "today") {
      startDate = new Date(today);
    } else if (period === "7days") {
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30days") {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "custom") {
      if (!customStartDate || !customEndDate) {
        toast.error("Selecione as datas customizadas");
        return null;
      }
      startDate = new Date(customStartDate);
      endDate.setTime(new Date(customEndDate).getTime());
    }

    return { startDate, endDate };
  };

  const dateRange = getDateRange();

  // Queries
  const { data: dailyTrend = [] } = trpc.analytics.getDailyTrend.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const { data: topProducts = [] } = trpc.analytics.getTopProducts.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 5 } : { startDate: new Date(), endDate: new Date(), limit: 5 },
    { enabled: !!dateRange }
  );

  const { data: stats } = trpc.analytics.getStats.useQuery(
    dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : { startDate: new Date(), endDate: new Date() },
    { enabled: !!dateRange }
  );

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  const handleExportCSV = () => {
    if (!stats) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const csvContent = [
      ["Métrica", "Valor"],
      ["Total Produzido", stats.totalQuantity || 0],
      ["Total de Itens", stats.totalItems || 0],
      ["Produtos Únicos", stats.uniqueProducts || 0],
      ["Média por Dia", (stats.averagePerDay || 0).toFixed(2)],
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de KPI</h1>
        <p className="text-muted-foreground mt-2">Visualize dados históricos de produção</p>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Customizado</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <>
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
              </>
            )}

            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download size={18} />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Produzido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalQuantity || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalItems || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Produtos Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.uniqueProducts || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(stats?.averagePerDay || 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">unidades/dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Diária</CardTitle>
            <CardDescription>Produção por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalQuantity" stroke="#3b82f6" name="Quantidade" />
                <Line type="monotone" dataKey="totalItems" stroke="#10b981" name="Itens" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produtos</CardTitle>
            <CardDescription>Produtos mais produzidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="#3b82f6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Produtos</CardTitle>
            <CardDescription>Proporção de produção</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  dataKey="totalQuantity"
                  nameKey="code"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes dos Top Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium text-sm">{product.code}</p>
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{product.totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">{product.count} lançamentos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
