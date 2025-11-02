import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertCircle, CheckCircle, Circle, ScanLine } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface ProductionItem {
  id: string;
  productId: string;
  productCode: string;
  productDescription: string;
  photoUrl?: string | null;
  quantity: number;
  insertedAt: Date;
  checked: boolean;
}

export default function ProductionEntry() {
  const { user } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, "dd/MM/yy", { locale: ptBR });

  const [searchQuery, setSearchQuery] = useState("");
  const [partialSearch, setPartialSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Utils para invalidação de cache
  const utils = trpc.useUtils();

  // Queries
  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: today }
  );

  const { data: entriesData } = trpc.productionEntries.getByDate.useQuery(
    { date: today }
  );
  const safeEntriesData = entriesData && Array.isArray(entriesData) ? entriesData : [];

  // Busca parcial (quando checkbox ativo)
  const { data: searchResults = [] } = trpc.products.searchCombined.useQuery(
    { query: searchQuery },
    { enabled: partialSearch && searchQuery.length >= 2 }
  );

  // Mutations
  const addEntryMutation = trpc.productionEntries.add.useMutation({
    onSuccess: () => {
      // Invalidar queries para atualizar os dados
      utils.productionEntries.getByDate.invalidate();
      utils.productionEntries.getSummary.invalidate();
    },
  });

  const updateEntryMutation = trpc.productionEntries.update.useMutation({
    onSuccess: () => {
      utils.productionEntries.getByDate.invalidate();
      utils.productionEntries.getSummary.invalidate();
    },
    onError: () => {
      toast.error("Erro ao atualizar item");
    },
  });

  const deleteEntryMutation = trpc.productionEntries.delete.useMutation({
    onSuccess: () => {
      utils.productionEntries.getByDate.invalidate();
      utils.productionEntries.getSummary.invalidate();
    },
  });

  const items = useMemo(() => {
    return safeEntriesData;
  }, [safeEntriesData]);

  const findProductByCode = async (query: string) => {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return null;

    try {
      const results = await utils.products.searchCombined.fetch({ query: normalized });
      const safeResults = Array.isArray(results) ? results : [];
      return (
        safeResults.find(
          (p: any) =>
            p.code?.toUpperCase() === normalized ||
            p.barcode?.toUpperCase() === normalized
        ) ?? null
      );
    } catch (error) {
      console.error("findProductByCode error:", error);
      return null;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const product = await findProductByCode(searchQuery);

    if (product) {
      setSelectedProduct(product);
      setQuantity("1");
      setShowQuantityModal(true);
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    } else {
      setNotFoundCode(searchQuery.trim());
      setShowNotFoundModal(true);
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setQuantity("1");
    setShowQuantityModal(true);
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (barcodeMode) {
      // Em modo leitor o Enter é tratado pelo listener global
      if (e.key === "Enter") {
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!partialSearch) {
        handleSearch();
      }
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) return;

    const qty = parseInt(quantity) || 0;
    if (qty < 1) {
      toast.error("Quantidade deve ser maior que 0");
      return;
    }

    try {
      await addEntryMutation.mutateAsync({
        productId: selectedProduct.id,
        productCode: selectedProduct.code,
        productDescription: selectedProduct.description,
        photoUrl: selectedProduct.photoUrl || undefined,
        quantity: qty,
        sessionDate: today,
        grouping: true,
      });

      toast.success("Produto adicionado");
      setShowQuantityModal(false);
      setSelectedProduct(null);
      setQuantity("1");
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao adicionar produto");
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddProduct();
    }
  };

  const handleBarcodeScan = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const product = await findProductByCode(code);
    if (!product) {
      setNotFoundCode(code);
      setShowNotFoundModal(true);
      return;
    }

    try {
      await addEntryMutation.mutateAsync({
        productId: product.id,
        productCode: product.code,
        productDescription: product.description,
        photoUrl: product.photoUrl || undefined,
        quantity: 1,
        sessionDate: today,
        grouping: true,
      });
      toast.success(`Produto ${product.code} lançado`);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao adicionar produto");
    }
  };

  const resetBarcodeBuffer = () => {
    barcodeBufferRef.current = "";
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
      barcodeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!barcodeMode) {
      resetBarcodeBuffer();
      return;
    }

    const handleKeyDownGlobal = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingField = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      // Mesmo em modo leitor, permitimos Delete/Backspace para limpar campos manualmente
      if (isTypingField && !event.key.startsWith("F")) {
        event.preventDefault();
        activeElement.blur();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const code = barcodeBufferRef.current;
        resetBarcodeBuffer();
        if (code) {
          handleBarcodeScan(code);
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        barcodeBufferRef.current += event.key;
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        barcodeTimeoutRef.current = setTimeout(() => {
          resetBarcodeBuffer();
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => {
      window.removeEventListener("keydown", handleKeyDownGlobal);
      resetBarcodeBuffer();
    };
  }, [barcodeMode]);

  const toggleBarcodeMode = () => {
    setBarcodeMode((prev) => {
      const next = !prev;
      resetBarcodeBuffer();
      if (next) {
        searchInputRef.current?.blur();
        toast.info("Modo leitor ativado. Escaneie um código para lançar quantidade 1.");
      } else {
        toast.info("Modo leitor desativado.");
      }
      return next;
    });
  };

  const handleToggleChecked = async (item: ProductionItem) => {
    try {
      await updateEntryMutation.mutateAsync({
        id: item.id,
        checked: !item.checked,
      });
    } catch (error) {
      // toast gerenciado no onError
    }
  };

  const handleDeleteItem = async (item: ProductionItem) => {
    try {
      await deleteEntryMutation.mutateAsync({ id: item.id });
      toast.success("Item removido");
    } catch (error) {
      toast.error("Erro ao remover item");
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lançamento de Produção</h1>
        <p className="text-muted-foreground mt-2">Registre a produção do dia</p>
      </div>

      {/* Search Section */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="partial-search"
                checked={partialSearch}
                onCheckedChange={(checked) => setPartialSearch(checked as boolean)}
              />
              <Label htmlFor="partial-search" className="cursor-pointer text-sm">Busca parcial</Label>
            </div>
            <div className="flex items-center gap-2">
              {barcodeMode && <Badge variant="secondary">Modo leitor ativo</Badge>}
              <Button
                type="button"
                variant={barcodeMode ? "default" : "outline"}
                onClick={toggleBarcodeMode}
                className="whitespace-nowrap"
              >
                <ScanLine className="mr-2 h-4 w-4" />
                {barcodeMode ? "Desativar leitor" : "Modo leitor"}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="search" className="text-base font-semibold">Buscar Produto</Label>
            <div className="mt-2">
              <Input
                id="search"
                ref={searchInputRef}
                placeholder="Digite código ou descrição sobre o pressione Enter"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-base"
              />
            </div>
          </div>

          {/* Resultados da busca parcial */}
          {partialSearch && searchQuery.length >= 2 && (
            <div className="border-t pt-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="p-3 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
                    >
                      <div className="flex gap-3">
                        {product.photoUrl && (
                          <img
                            src={product.photoUrl}
                            alt={product.code}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{product.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                          {product.barcode && <p className="text-xs text-muted-foreground">Barras: {product.barcode}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Not Found Modal */}
      <Dialog open={showNotFoundModal} onOpenChange={setShowNotFoundModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Produto Não Encontrado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Produto não encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum produto corresponde à busca: <strong>{notFoundCode}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNotFoundModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Modal */}
      <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informar Quantidade</DialogTitle>
            <DialogDescription className="text-base">
              {selectedProduct?.code} - {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="quantity" className="text-base">Quantidade</Label>
            <Input
              id="quantity"
              ref={quantityInputRef}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={handleQuantityKeyDown}
              className="text-lg mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQuantityModal(false);
                setSelectedProduct(null);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={addEntryMutation.isPending}
            >
              {addEntryMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items List */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Itens Lançados</h2>
            <div className="text-sm text-muted-foreground mt-1">
              Produção de {todayStr}
            </div>
            <div className="text-sm mt-1">
              <span className="font-semibold">QUANTIDADE:</span> {summary.totalItems} |
              <span className="font-semibold ml-2">SOMA TOTAL:</span> {summary.totalQuantity}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-t">
              <AlertCircle className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg">Nenhum item lançado ainda</p>
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
                    <TableHead className="w-[120px]">Operador</TableHead>
                    <TableHead className="w-[140px]">Conferido</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow 
                      key={item.id}
                      className={item.checked ? "bg-green-50" : index % 2 === 0 ? "bg-amber-100/60" : "bg-white"}
                    >
                      <TableCell className={`font-mono text-blue-600 ${item.checked ? "line-through" : ""}`}>
                        {item.productCode}
                      </TableCell>
                      <TableCell className={`max-w-[300px] truncate ${item.checked ? "line-through" : ""}`}>
                        {item.productDescription}
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
                      <TableCell className="text-sm">{item.checked && user?.name ? user.name : ""}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className={`font-semibold ${item.checked ? "text-green-600" : "text-yellow-600"}`}>
                            {item.checked ? "Sim" : "Não"}
                          </span>
                          {item.checked && user?.name && (
                            <span className="text-xs text-muted-foreground">{user.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          className="h-8 w-8 p-0 rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
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
