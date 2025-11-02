import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Download, CheckCircle, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProductionReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [isFinalizingDay, setIsFinalizingDay] = useState(false);

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const utils = trpc.useUtils();

  const { data: snapshot } = trpc.snapshots.getByDate.useQuery(
    { date: selectedDateObj }
  );

  const { data: entries = [] } = trpc.productionEntries.getByDate.useQuery(
    { date: selectedDateObj },
    { enabled: !snapshot }
  );

  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: selectedDateObj },
    { enabled: !snapshot }
  );

  const updateEntryMutation = trpc.productionEntries.update.useMutation({
    onSuccess: () => {
      utils.productionEntries.getByDate.invalidate();
    },
  });

  const finalizeDayMutation = trpc.snapshots.finalize.useMutation({
    onSuccess: () => {
      toast.success("Dia finalizado com sucesso!");
      utils.snapshots.getByDate.invalidate();
      utils.productionEntries.getByDate.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao finalizar dia");
    },
  });

  const displayData = snapshot
    ? JSON.parse(typeof snapshot.payloadJson === 'string' ? snapshot.payloadJson : "[]")
    : entries;

  const displaySummary = snapshot
    ? { totalItems: snapshot.totalItems, totalQuantity: snapshot.totalQuantity }
    : summary;

  const isFinalized = !!snapshot;
  const allChecked = displayData.every((item: any) => item.checked);
  const hasItems = displayData.length > 0;

  const handleToggleChecked = async (item: any) => {
    if (isFinalized) {
      toast.error("Dia já finalizado, não é possível alterar");
      return;
    }
    try {
      await updateEntryMutation.mutateAsync({
        id: item.id,
        checked: !item.checked,
      });
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleFinalizeDay = async () => {
    if (!hasItems) {
      toast.error("Nenhum item para finalizar");
      return;
    }
    if (!allChecked) {
      toast.error("Confira todos os itens antes de finalizar o dia");
      return;
    }
    if (isFinalized) {
      toast.error("Este dia já foi finalizado");
      return;
    }

    setIsFinalizingDay(true);
    try {
      await finalizeDayMutation.mutateAsync({
        sessionDate: selectedDateObj,
        entries: displayData.map((item: any) => ({
          photoUrl: item.photoUrl || undefined,
          code: item.productCode || item.code,
          description: item.productDescription || item.description,
          quantity: item.quantity,
          insertedAt: item.insertedAt,
          checked: item.checked,
        })),
      });
    } finally {
      setIsFinalizingDay(false);
    }
  };

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
        <CardContent className="pt-6">
          <div>
            <Label htmlFor="date-filter" className="text-base font-semibold">Filtrar por Data</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Detalhes da Produção</h2>
              <div className="text-sm text-muted-foreground mt-1">
                Relatório de {format(selectedDateObj, "dd/MM/yy", { locale: ptBR })}
              </div>
              <div className="text-sm mt-1">
                <span className="font-semibold">QUANTIDADE ITENS:</span> {displaySummary.totalItems} |
                <span className="font-semibold ml-2">SOMA TOTAL:</span> {displaySummary.totalQuantity}
              </div>
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
          </div>

          {displayData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-t">
              <AlertCircle className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg">Nenhum dado para esta data</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[80px] text-center">Qtd</TableHead>
                    <TableHead className="w-[200px]">Inserido em</TableHead>
                    <TableHead className="w-[140px]">Conferido</TableHead>
                    <TableHead className="w-[120px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((item: any, index: number) => {
                    const isChecked = item.checked;
                    return (
                      <TableRow 
                        key={item.id || index}
                        className={isChecked ? "bg-green-50" : "bg-amber-50/50"}
                      >
                        <TableCell className={`font-mono text-blue-600 ${isChecked ? "line-through" : ""}`}>
                          {item.code || item.productCode}
                        </TableCell>
                        <TableCell className={`max-w-[300px] truncate ${isChecked ? "line-through" : ""}`}>
                          {item.description || item.productDescription}
                        </TableCell>
                        <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{format(new Date(item.insertedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.insertedAt), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className={isChecked ? "text-green-700 font-semibold" : "text-yellow-600 font-semibold"}>
                              {isChecked ? "Sim" : "Não"}
                            </span>
                            {isChecked && item.createdByName && (
                              <span className="text-xs text-muted-foreground">{item.createdByName}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleChecked(item)}
                            disabled={isFinalized}
                            className={`h-8 w-8 p-0 rounded-full ${
                              isChecked 
                                ? "bg-green-500 text-white hover:bg-green-600" 
                                : "bg-yellow-400 text-white hover:bg-yellow-500"
                            }`}
                          >
                            {isChecked ? <CheckCircle size={18} /> : <Circle size={18} />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finalize Button */}
      {hasItems && !isFinalized && (
        <Button
          onClick={handleFinalizeDay}
          disabled={isFinalizingDay}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isFinalizingDay ? "Finalizando..." : "Finalizar Dia"}
        </Button>
      )}

      {/* Status Message */}
      {isFinalized && (
        <div className="text-center text-sm text-red-600 font-medium">
          ⚠ Despois de finalizar, não é possível alterar dados!
        </div>
      )}
    </div>
  );
}
