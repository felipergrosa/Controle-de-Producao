import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConfettiButton } from "@/components/ui/confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, CheckCircle, Circle, Lock, Unlock, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProductionReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [isFinalizingDay, setIsFinalizingDay] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const utils = trpc.useUtils();

  // Pegar role do contexto da sessão atual
  const { data: sessionUser } = trpc.auth.me.useQuery();
  const isAdmin = sessionUser?.role === "admin";

  const { data: dayStatus } = trpc.snapshots.getStatus.useQuery(
    { date: selectedDateObj },
    { refetchInterval: 10000 } // Revalidar a cada 10s
  );

  const { data: snapshotData } = trpc.snapshots.getByDate.useQuery(
    { date: selectedDateObj }
  );

  const { data: entries = [] } = trpc.productionEntries.getByDate.useQuery(
    { date: selectedDateObj },
    { enabled: dayStatus?.isOpen ?? true }
  );

  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: selectedDateObj },
    { enabled: dayStatus?.isOpen ?? true }
  );

  const updateEntryMutation = trpc.productionEntries.update.useMutation({
    onSuccess: () => {
      utils.productionEntries.getByDate.invalidate();
      utils.productionEntries.getSummary.invalidate();
    },
  });

  const finalizeDayMutation = trpc.snapshots.finalize.useMutation({
    onSuccess: () => {
      toast.success("Dia finalizado com sucesso!");
      utils.snapshots.getByDate.invalidate();
      utils.snapshots.getStatus.invalidate();
      utils.productionEntries.getByDate.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao finalizar dia");
    },
  });

  const reopenDayMutation = trpc.snapshots.reopen.useMutation({
    onSuccess: () => {
      toast.success("Dia reaberto com sucesso!");
      utils.snapshots.getByDate.invalidate();
      utils.snapshots.getStatus.invalidate();
      utils.productionEntries.getByDate.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao reabrir dia");
    },
  });

  const finalizedSnapshot = snapshotData ?? dayStatus?.snapshot ?? null;

  const parsedSnapshotEntries = useMemo(() => {
    if (!finalizedSnapshot) return [] as any[];
    const payload = finalizedSnapshot.payloadJson as unknown;
    if (!payload) return [] as any[];
    if (Array.isArray(payload)) {
      return payload as any[];
    }
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload) as any[];
      } catch (error) {
        console.error("Erro ao converter payload do snapshot", error);
        return [] as any[];
      }
    }
    return (payload as any[]) ?? [];
  }, [finalizedSnapshot]);

  const displayData = finalizedSnapshot && parsedSnapshotEntries.length > 0 && !dayStatus?.isOpen
    ? parsedSnapshotEntries
    : entries;

  const displaySummary = finalizedSnapshot && !dayStatus?.isOpen
    ? { totalItems: finalizedSnapshot.totalItems, totalQuantity: finalizedSnapshot.totalQuantity }
    : summary;

  const isFinalized = dayStatus ? !dayStatus.isOpen : false;
  const canFinalize = dayStatus?.canFinalize ?? false;
  const allChecked = displayData.every((item: any) => item.checked);
  const hasItems = displayData.length > 0;

  useEffect(() => {
    console.log("[FinalizeDebug] dayStatus", dayStatus);
    console.log("[FinalizeDebug] state", {
      hasItems,
      allChecked,
      isFinalized,
      canFinalize,
      reason: dayStatus?.reason,
      entries: displayData.length,
    });
  }, [dayStatus, hasItems, allChecked, isFinalized, canFinalize, displayData.length]);

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
    if (!canFinalize) {
      toast.error(dayStatus?.reason || "Não é possível finalizar este dia agora");
      return;
    }

    setIsFinalizingDay(true);
    try {
      await finalizeDayMutation.mutateAsync({
        sessionDate: selectedDateObj,
        entries: displayData.map((item: any) => ({
          productId: item.productId,
          photoUrl: item.photoUrl || undefined,
          code: item.productCode || item.code,
          description: item.productDescription || item.description,
          quantity: item.quantity,
          insertedAt: new Date(item.insertedAt),
          checked: item.checked,
        })),
      });
    } finally {
      setIsFinalizingDay(false);
    }
  };

  const handleReopenDay = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem reabrir dias");
      return;
    }
    if (!isFinalized) {
      toast.error("Este dia não está finalizado");
      return;
    }

    if (!confirm("Tem certeza que deseja reabrir este dia? Os itens serão disponibilizados para edição novamente.")) {
      return;
    }

    setIsReopening(true);
    try {
      await reopenDayMutation.mutateAsync({
        sessionDate: selectedDateObj,
      });
    } finally {
      setIsReopening(false);
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="date-filter" className="text-base font-semibold">Filtrar por Data</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs mt-2"
              />
            </div>
            <div className="flex items-center gap-2">
              {isFinalized ? (
                <Badge variant="destructive" className="h-8 px-4 gap-2">
                  <Lock size={16} />
                  Finalizado
                </Badge>
              ) : (
                <Badge variant="secondary" className="h-8 px-4 gap-2">
                  <Unlock size={16} />
                  Em Aberto
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {!canFinalize && !isFinalized && dayStatus?.reason && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{dayStatus.reason}</span>
          </AlertDescription>
        </Alert>
      )}

      {isFinalized && finalizedSnapshot && (
        <Alert variant="default" className="border-green-600 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium text-green-900">
                {finalizedSnapshot.finalizedAt ? (
                  <>Dia finalizado em {format(new Date(finalizedSnapshot.finalizedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                ) : (
                  <>Dia finalizado</>
                )}
              </span>
              {finalizedSnapshot.finalizedBy && (
                <span className="text-sm text-green-700 ml-2">por {finalizedSnapshot.finalizedBy}</span>
              )}
              {finalizedSnapshot.reopenedAt && finalizedSnapshot.reopenedBy && (
                <div className="text-sm text-green-700 mt-1">
                  Reaberto em {format(new Date(finalizedSnapshot.reopenedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por {finalizedSnapshot.reopenedBy}
                </div>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenDay}
                disabled={isReopening}
                className="ml-4"
              >
                <Unlock className="h-4 w-4 mr-2" />
                {isReopening ? "Reabrindo..." : "Reabrir Dia"}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Detalhes da Produção</h2>
              <div className="text-sm text-muted-foreground mt-1">
                Relatório de {format(selectedDateObj, "dd/MM/yyyy", { locale: ptBR })}
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
                    <TableHead className="w-[60px] text-center">Qtd</TableHead>
                    <TableHead className="w-[140px] text-center">Inserido em</TableHead>
                    <TableHead className="w-[140px] text-center">Conferido</TableHead>
                    {!isFinalized && <TableHead className="w-[60px] text-center">Ações</TableHead>}
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
                        <TableCell className="text-sm text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs">{format(new Date(item.insertedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                            {item.createdByName && (
                              <span className="text-xs text-muted-foreground">{item.createdByName}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`font-semibold text-xs ${
                                isChecked ? "text-green-600" : "text-yellow-600"
                              }`}
                            >
                              {isChecked ? "Sim" : "Não"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {isChecked
                                ? item.checkedByName
                                  ? `Conferido por ${item.checkedByName}`
                                  : ""
                                : "Aguardando conferência"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {isChecked && item.checkedAt
                                ? format(new Date(item.checkedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "--"}
                            </span>
                          </div>
                        </TableCell>
                        {!isFinalized && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleChecked(item)}
                              className={`h-8 w-8 p-0 rounded-full ${
                                isChecked 
                                  ? "bg-green-500 text-white hover:bg-green-600" 
                                  : "bg-yellow-400 text-white hover:bg-yellow-500"
                              }`}
                            >
                              {isChecked ? <CheckCircle size={18} /> : <Circle size={18} />}
                            </Button>
                          </TableCell>
                        )}
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
        <div className="space-y-2">
          <ConfettiButton
            onClick={handleFinalizeDay}
            disabled={isFinalizingDay || !canFinalize || !allChecked}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
            effect="side-cannons"
          >
            {isFinalizingDay ? "Finalizando..." : "Finalizar Dia"}
          </ConfettiButton>
          {!allChecked && (
            <p className="text-center text-sm text-amber-600">
              ⚠ Confira todos os itens antes de finalizar
            </p>
          )}
          {!canFinalize && dayStatus?.reason && (
            <p className="text-center text-sm text-red-600">
              ⚠ {dayStatus.reason}
            </p>
          )}
        </div>
      )}

      {/* Status Message */}
      {isFinalized && (
        <div className="text-center text-sm text-red-600 font-medium">
          ⚠ Depois de finalizar não é possível alterar dados!
        </div>
      )}
    </div>
  );
}
