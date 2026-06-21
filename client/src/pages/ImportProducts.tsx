import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Upload, Plus, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ParsedProduct {
  code: string;
  description: string;
  barcode?: string;
  photoUrl?: string;
}

interface ColumnMapping {
  code?: number;
  description?: number;
  barcode?: number;
  photoUrl?: number;
}

interface ImportResult {
  inserted: number;
  updated: number;
  errors: number;
  processed: number;
  total: number;
  processing: boolean;
}

export default function ImportProducts() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ 
    code: "", 
    description: "", 
    barcode: "", 
    photoUrl: "",
    pesoUnitarioG: "",
    diametroMm: "",
    espessuraMm: "",
    idealPecasHora: "",
    metaQuebraPct: ""
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createProductMutation = trpc.products.create.useMutation();
  const createOrUpdateMutation = trpc.products.createOrUpdate.useMutation();
  const getByCodeQuery = trpc.products.getByCode.useQuery;

  // Query para exportação (desabilitada por padrão para não rodar no load da página)
  const { refetch: refetchProducts, isFetching: isExporting } = trpc.products.list.useQuery(undefined, {
    enabled: false,
  });

  const handleExportProducts = async () => {
    try {
      const { data } = await refetchProducts();
      if (!data || data.length === 0) {
        toast.error("Nenhum produto cadastrado para exportar");
        return;
      }

      // Formatar dados para a planilha
      const formattedData = data.map((p) => ({
        "Código": p.code,
        "Descrição": p.description,
        "Código de Barras": p.barcode || "",
        "URL da Imagem": p.photoUrl || "",
        "Total Produzido": p.totalProduced,
        "Criado em": p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR") : "",
        "Atualizado em": p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("pt-BR") : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
      XLSX.writeFile(workbook, "produtos_exportados.xlsx");
      toast.success("Produtos exportados com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar produtos");
      console.error(error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo .xlsx ou .csv");
      return;
    }

    setFile(selectedFile);
    parseFileHeaders(selectedFile);
  };

  const parseFileHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rows.length === 0) {
          toast.error("Arquivo vazio");
          return;
        }

        const headers = rows[0] as string[];
        setSheetHeaders(headers);
        setPreviewData(rows.slice(1, 11)); // Primeiras 10 linhas
        setShowMapping(true);
      } catch (error) {
        toast.error("Erro ao ler arquivo");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingSubmit = async () => {
    if (!file || !columnMapping || columnMapping.code === undefined || columnMapping.description === undefined) {
      toast.error("Mapeie as colunas obrigatórias antes de importar");
      return;
    }

    const codeIdx = columnMapping.code;
    const descriptionIdx = columnMapping.description;
    const barcodeIdx = columnMapping.barcode;
    const photoIdx = columnMapping.photoUrl;

    setIsImporting(true);
    setShowMapping(false);
    setImportResult({ inserted: 0, updated: 0, errors: 0, processed: 0, total: 0, processing: true });
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        let inserted = 0;
        let updated = 0;
        let errors = 0;
        let processed = 0;

        const total = Math.max(rows.length - 1, 0);
        setImportResult((prev) =>
          prev ? { ...prev, total } : { inserted: 0, updated: 0, errors: 0, processed: 0, total, processing: true }
        );

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          try {
            const code = row[codeIdx]?.toString().trim();
            const description = row[descriptionIdx]?.toString().trim().toUpperCase();
            const barcode =
              barcodeIdx !== undefined ? row[barcodeIdx]?.toString().trim() || undefined : undefined;
            const photoUrl = photoIdx !== undefined ? row[photoIdx]?.toString().trim() : undefined;

            if (!code || !description) {
              errors++;
              processed++;
              setImportResult((prev) =>
                prev ? { ...prev, inserted, updated, errors, processed } : prev
              );
              continue;
            }

            // Sempre incrementa inserted, pois createOrUpdate faz upsert
            try {
              await createOrUpdateMutation.mutateAsync({
                code,
                description,
                photoUrl,
                barcode,
              });
              inserted++;
            } catch (err) {
              errors++;
            }
          } catch (error) {
            errors++;
          }
          processed++;
          setImportResult((prev) =>
            prev ? { ...prev, inserted, updated, errors, processed } : prev
          );
        }

        setImportResult((prev) =>
          prev ? { ...prev, inserted, updated, errors, processed, total, processing: false } : null
        );
        setIsImporting(false);
        setFile(null);
        setParsedData([]);
        setColumnMapping(null);
        toast.success("Importação concluída!");
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar");
      setImportResult((prev) => (prev ? { ...prev, processing: false } : prev));
      setIsImporting(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.code || !newProduct.description) {
      toast.error("Código e Descrição são obrigatórios");
      return;
    }

    try {
      const pesoG = newProduct.pesoUnitarioG ? String(Number(newProduct.pesoUnitarioG) * 1000) : null;
      await createProductMutation.mutateAsync({
        code: newProduct.code,
        description: newProduct.description.toUpperCase(),
        barcode: newProduct.barcode || undefined,
        photoUrl: newProduct.photoUrl || undefined,
        pesoUnitarioG: pesoG,
        diametroMm: newProduct.diametroMm || null,
        espessuraMm: newProduct.espessuraMm || null,
        idealPecasHora: newProduct.idealPecasHora ? Number(newProduct.idealPecasHora) : null,
        metaQuebraPct: newProduct.metaQuebraPct || null,
      });
      toast.success("Produto criado com sucesso!");
      setShowCreateModal(false);
      setNewProduct({ 
        code: "", 
        description: "", 
        barcode: "", 
        photoUrl: "",
        pesoUnitarioG: "",
        diametroMm: "",
        espessuraMm: "",
        idealPecasHora: "",
        metaQuebraPct: ""
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar produto");
    }
  };

  const toDisplay = (val: string | number | null | undefined) => {
    if (val === undefined || val === null) return "";
    return String(val).replace(".", ",");
  };

  const handleCreateDiametroChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, "");
    const decimalVal = cleanVal.replace(",", ".");
    const parts = decimalVal.split(".");
    const formattedVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");

    const d = Number(formattedVal) || 0;
    const esp = newProduct.espessuraMm || "0";
    const eNum = Number(esp) || 0;
    const calculatedPeso = (d > 0 && eNum > 0) ? (d * d * eNum * 2.14).toFixed(4) : "";

    setNewProduct(prev => ({
      ...prev,
      diametroMm: formattedVal,
      pesoUnitarioG: calculatedPeso
    }));
  };

  const handleCreateEspessuraChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, "");
    const decimalVal = cleanVal.replace(",", ".");
    const parts = decimalVal.split(".");
    const formattedVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");

    const eNum = Number(formattedVal) || 0;
    const diam = newProduct.diametroMm || "0";
    const d = Number(diam) || 0;
    const calculatedPeso = (d > 0 && eNum > 0) ? (d * d * eNum * 2.14).toFixed(4) : "";

    setNewProduct(prev => ({
      ...prev,
      espessuraMm: formattedVal,
      pesoUnitarioG: calculatedPeso
    }));
  };

  const handleCreateIdealPHChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    setNewProduct(prev => ({
      ...prev,
      idealPecasHora: cleanVal
    }));
  };

  const handleCreateMetaQuebraChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, "");
    const decimalVal = cleanVal.replace(",", ".");
    const parts = decimalVal.split(".");
    const formattedVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");

    setNewProduct(prev => ({
      ...prev,
      metaQuebraPct: formattedVal
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
          <p className="text-muted-foreground mt-2">Importe ou crie produtos manualmente</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportProducts} variant="outline" className="gap-2" disabled={isExporting}>
            <Download size={18} />
            {isExporting ? "Exportando..." : "Exportar Produtos"}
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={18} />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Novo Produto</DialogTitle>
            <DialogDescription>Preencha os dados do novo produto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código *</Label>
              <Input
                placeholder="Ex: PROD001"
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: PRODUTO 1"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Código de Barras</Label>
              <Input
                placeholder="Ex: 1234567890123"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              />
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input
                placeholder="Ex: https://..."
                value={newProduct.photoUrl}
                onChange={(e) => setNewProduct({ ...newProduct, photoUrl: e.target.value })}
              />
            </div>

            <div className="border-t pt-4 mt-2 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dados Físicos & Metas (Repuxo)
              </div>
              
              {/* Peso Unitário apenas exibido no topo (sem campo de input) */}
              <div className="bg-indigo-50/50 border border-indigo-100/80 p-3 rounded-md flex justify-between items-center mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Peso Unitário</span>
                <span className="text-lg font-mono font-bold text-indigo-600">
                  {newProduct.pesoUnitarioG && !isNaN(Number(newProduct.pesoUnitarioG)) 
                    ? `${Number(newProduct.pesoUnitarioG).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} kg` 
                    : "0,0000 kg"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Diâmetro do Disco (m)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 0,220"
                    value={toDisplay(newProduct.diametroMm)}
                    onChange={(e) => handleCreateDiametroChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Espessura da Chapa (mm)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1,10"
                    value={toDisplay(newProduct.espessuraMm)}
                    onChange={(e) => handleCreateEspessuraChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ideal Peças/Hora</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 100"
                    value={newProduct.idealPecasHora}
                    onChange={(e) => handleCreateIdealPHChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Meta Máxima de Quebra (%)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1,00"
                    value={toDisplay(newProduct.metaQuebraPct)}
                    onChange={(e) => handleCreateMetaQuebraChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProduct} disabled={createProductMutation.isPending}>
              Criar Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Mapping Dialog */}
      <Dialog open={showMapping} onOpenChange={setShowMapping}>
        <DialogContent sizeVariant="full" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar em Lote (Excel/CSV)</DialogTitle>
            <DialogDescription>Mapeie as colunas do seu arquivo aos campos do sistema</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Mapeamento */}
            <div className="space-y-4">
              <h3 className="font-semibold">1. Mapeie as colunas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código *</Label>
                  <Select
                    value={columnMapping?.code !== undefined ? columnMapping.code.toString() : ""}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...(prev ?? {}),
                        code: parseInt(v, 10),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição *</Label>
                  <Select
                    value={columnMapping?.description !== undefined ? columnMapping.description.toString() : ""}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...(prev ?? {}),
                        description: parseInt(v, 10),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Select
                    value={columnMapping?.barcode !== undefined ? columnMapping.barcode.toString() : "-1"}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...(prev ?? {}),
                        barcode: v !== "-1" ? parseInt(v, 10) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Nenhum</SelectItem>
                      {sheetHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Imagem</Label>
                  <Select
                    value={columnMapping?.photoUrl !== undefined ? columnMapping.photoUrl.toString() : "-1"}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...(prev ?? {}),
                        photoUrl: v !== "-1" ? parseInt(v, 10) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Nenhum</SelectItem>
                      {sheetHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 2: Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold">2. Pré-visualização (10 primeiras linhas)</h3>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CÓDIGO</TableHead>
                      <TableHead>DESCRIÇÃO</TableHead>
                      <TableHead>BARRAS</TableHead>
                      <TableHead>IMG_LINK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {row[columnMapping?.code ?? 0]}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row[columnMapping?.description ?? 1]}
                        </TableCell>
                        <TableCell className="text-sm">
                          {columnMapping?.barcode !== undefined ? row[columnMapping.barcode] : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {columnMapping?.photoUrl !== undefined ? (
                            <a
                              href={row[columnMapping.photoUrl] ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Link
                            </a>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapping(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMappingSubmit}
              disabled={
                isImporting ||
                columnMapping?.code === undefined ||
                columnMapping?.description === undefined
              }
            >
              {isImporting ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Result Modal */}
      <Dialog open={!!importResult} onOpenChange={() => !importResult?.processing && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className={importResult?.processing ? "text-blue-600" : "text-green-600"} size={24} />
              {importResult?.processing ? "Importando produtos" : "Importação concluída"}
            </DialogTitle>
            <DialogDescription>
              {importResult?.processing
                ? "Processando arquivo. Este painel é atualizado em tempo real."
                : "Resumo do processamento do arquivo enviado."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {importResult?.processed ?? 0} de {importResult?.total ?? 0} linhas processadas
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-600">{importResult?.inserted || 0}</div>
                  <div className="text-sm text-muted-foreground">Produtos Inseridos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{importResult?.updated || 0}</div>
                  <div className="text-sm text-muted-foreground">Produtos Atualizados</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-red-600">{importResult?.errors || 0}</div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setImportResult(null)} disabled={importResult?.processing}>
              {importResult?.processing ? "Aguardando..." : "Fechar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>Selecione um arquivo .xlsx ou .csv com os produtos</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition"
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="font-medium">Clique para selecionar ou arraste um arquivo</p>
            <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .csv</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  );
}
