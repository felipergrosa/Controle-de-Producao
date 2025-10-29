import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Trash2, X, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [grouping, setGrouping] = useState(true);
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);
  const [isFinalizingDay, setIsFinalizingDay] = useState(false);

  // Queries - busca combinada por código ou descrição
  const { data: searchResults = [] } = trpc.products.searchCombined.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: today },
    { refetchInterval: 5000 }
  );

  const entriesQuery = trpc.productionEntries.getByDate.useQuery(
    { date: today },
    { refetchInterval: 5000 }
  );
  const { data: entriesData } = entriesQuery;
  const safeEntriesData = entriesData && Array.isArray(entriesData) ? entriesData : [];

  // Mutations
  const addEntryMutation = trpc.productionEntries.add.useMutation();
  const updateEntryMutation = trpc.productionEntries.update.useMutation();
  const deleteEntryMutation = trpc.productionEntries.delete.useMutation();
  const finalizeDayMutation = trpc.snapshots.finalize.useMutation();

  // Usar resultados da busca combinada
  const displayResults = useMemo(() => {
    return searchResults;
  }, [searchResults]);

  const items = useMemo(() => {
    return safeEntriesData;
  }, [safeEntriesData]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return showOnlyUnchecked ? items.filter((item: any) => !item.checked) : items;
  }, [items, showOnlyUnchecked]);

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setQuantity("1");
    setShowModal(true);
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

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
        grouping,
      });

      toast.success("Produto adicionado à lista");
      setShowModal(false);
      setSelectedProduct(null);
      setQuantity("1");
      // Refetch the entries
      entriesQuery.refetch();
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao adicionar produto");
    }
  };

  const handleToggleChecked = async (item: ProductionItem) => {
    try {
      await updateEntryMutation.mutateAsync({
        id: item.id,
        checked: !item.checked,
      });
    } catch (error) {
      toast.error("Erro ao atualizar item");
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

  const handleFinalizeDay = async () => {
    if (items.length === 0) {
      toast.error("Nenhum item para finalizar");
      return;
    }

    setIsFinalizingDay(true);
    try {
      await finalizeDayMutation.mutateAsync({
        sessionDate: today,
        entries: items.map((item) => ({
          photoUrl: item.photoUrl || undefined,
          code: item.productCode,
          description: item.productDescription,
          quantity: item.quantity,
          insertedAt: item.insertedAt,
          checked: item.checked,
        })),
      });

      toast.success("Dia finalizado com sucesso!");
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar dia");
    } finally {
      setIsFinalizingDay(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lançamento de Produção</h1>
        <p className="text-muted-foreground mt-2">Registre a produção do dia</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qtd. de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qtd. Total Produzida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalQuantity}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Digite código ou descrição"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {searchQuery.length < 2 ? (
            <p className="text-sm text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
          ) : displayResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {displayResults.map((product) => (
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
        </CardContent>
      </Card>

      {/* Quantity Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar Quantidade</DialogTitle>
            <DialogDescription>
              {selectedProduct?.code} - {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantidade</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-lg"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setSelectedProduct(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={addEntryMutation.isPending}
              className="gap-2"
            >
              {addEntryMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Itens Lançados</CardTitle>
            <CardDescription>Produção de {todayStr}</CardDescription>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={showOnlyUnchecked} onCheckedChange={(v) => setShowOnlyUnchecked(v as boolean)} />
            <span className="text-sm">Apenas não conferidos</span>
          </label>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum item lançado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    item.checked ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="flex gap-3 mb-3">
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt={item.productCode}
                        className="w-20 h-20 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg">{item.productCode}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.productDescription}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inserido em: {new Date(item.insertedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleChecked(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.checked
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-yellow-200 text-yellow-700 hover:bg-yellow-300"
                        }`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finalize Button */}
      {items.length > 0 && (
        <Button
          onClick={handleFinalizeDay}
          disabled={isFinalizingDay}
          size="lg"
          className="w-full"
        >
          {isFinalizingDay ? "Finalizando..." : "Finalizar Dia!"}
        </Button>
      )}
    </div>
  );
}
