import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Download, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ProductionReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);

  const selectedDateObj = new Date(selectedDate + "T00:00:00");

  const { data: snapshot } = trpc.snapshots.getByDate.useQuery(
    { date: selectedDateObj },
    { refetchInterval: 5000 }
  );

  const { data: entries = [] } = trpc.productionEntries.getByDate.useQuery(
    { date: selectedDateObj },
    { enabled: !snapshot, refetchInterval: 5000 }
  );

  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: selectedDateObj },
    { enabled: !snapshot, refetchInterval: 5000 }
  );

  const displayData = snapshot
    ? JSON.parse(typeof snapshot.payloadJson === 'string' ? snapshot.payloadJson : "[]")
    : entries;

  const displaySummary = snapshot
    ? { totalItems: snapshot.totalItems, totalQuantity: snapshot.totalQuantity }
    : summary;

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const csvContent = [
        ["Data", selectedDate],
        ["Total de Itens", displaySummary.totalItems],
        ["Total Produzido", displaySummary.totalQuantity],
        [],
        ["Código", "Descrição", "Quantidade", "Inserido em", "Conferido"],
        ...displayData.map((item: any) => [
          item.code || item.productCode,
          item.description || item.productDescription,
          item.quantity,
          new Date(item.insertedAt).toLocaleString("pt-BR"),
          item.checked ? "Sim" : "Não",
        ]),
      ]
        .map((row: any) => row.map((cell: any) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-producao-${selectedDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado em CSV");
    } catch (error) {
      toast.error("Erro ao exportar CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXLSX = () => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["Data", selectedDate],
        ["Total de Itens", displaySummary.totalItems],
        ["Total Produzido", displaySummary.totalQuantity],
        [],
        ["Código", "Descrição", "Quantidade", "Inserido em", "Conferido"],
        ...displayData.map((item: any) => [
          item.code || item.productCode,
          item.description || item.productDescription,
          item.quantity,
          new Date(item.insertedAt).toLocaleString("pt-BR"),
          item.checked ? "Sim" : "Não",
        ]),
      ]);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
      XLSX.writeFile(workbook, `relatorio-producao-${selectedDate}.xlsx`);

      toast.success("Relatório exportado em XLSX");
    } catch (error) {
      toast.error("Erro ao exportar XLSX");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatório Diário de Produção</h1>
        <p className="text-muted-foreground mt-2">Consulte e exporte relatórios de produção</p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qtd. de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{displaySummary.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qtd. Total Produzida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{displaySummary.totalQuantity}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      {!snapshot && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Dia em andamento</p>
            <p className="text-sm text-yellow-800">Os dados podem mudar até a finalização do dia</p>
          </div>
        </div>
      )}

      {snapshot && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Dia finalizado</p>
            <p className="text-sm text-green-800">
              Finalizado em {new Date(snapshot.finalizedAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detalhes da Produção</CardTitle>
            <CardDescription>Relatório de {selectedDate}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || displayData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXLSX}
              disabled={isExporting || displayData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              XLSX
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {displayData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum dado para esta data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Inserido em</TableHead>
                    <TableHead>Conferido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((item: any, idx: number) => (
                    <TableRow key={idx} className={item.checked ? "opacity-50" : ""}>
                      <TableCell className={item.checked ? "line-through" : ""}>
                        {item.code || item.productCode}
                      </TableCell>
                      <TableCell className={item.checked ? "line-through" : ""}>
                        {item.description || item.productDescription}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(item.insertedAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className={item.checked ? "text-green-600 font-medium" : "text-gray-400"}>
                          {item.checked ? "✓" : "-"}
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
    </div>
  );
}
