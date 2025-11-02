import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Trash2, History, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ProductsQuery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Search both code and description
  const searchResults = trpc.products.search.useQuery(
    { query: searchQuery },
    { 
      enabled: searchQuery.length >= 2,
      staleTime: 30000, // Cache por 30 segundos
    }
  );

  const searchByDesc = trpc.products.searchByDescription.useQuery(
    { query: searchQuery },
    { 
      enabled: searchQuery.length >= 2,
      staleTime: 30000, // Cache por 30 segundos
    }
  );

  const utils = trpc.useUtils();

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto deletado com sucesso");
      setSelectedProduct(null);
      // Invalidar queries ao invés de refetch direto
      utils.products.search.invalidate();
      utils.products.searchByDescription.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar produto");
    },
  });

  const updateProductMutation2 = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso");
      setShowEditModal(false);
      setEditingProduct(null);
      // Invalidar queries ao invés de refetch direto
      utils.products.search.invalidate();
      utils.products.searchByDescription.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar produto");
    },
  });



  const getHistoryQuery = trpc.products.getHistory.useQuery(
    { productId: selectedProduct?.id || "" },
    { enabled: !!selectedProduct && showHistoryModal }
  );

  // Combine results
  const allResults = searchQuery.length >= 2
    ? Array.from(new Map([
        ...((searchResults.data || []) as any[]).map((p: any) => [p.id, p] as const),
        ...((searchByDesc.data || []) as any[]).map((p: any) => [p.id, p] as const),
      ]).values())
    : [];

  const isLoading = searchResults.isLoading || searchByDesc.isLoading;

  const handleDelete = async (productId: string) => {
    if (confirm("Tem certeza que deseja deletar este produto?")) {
      await deleteProductMutation.mutateAsync({ id: productId });
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct({ ...product });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct.code || !editingProduct.description) {
      toast.error("Código e Descrição são obrigatórios");
      return;
    }
    await updateProductMutation2.mutateAsync({
      code: editingProduct.code,
      description: editingProduct.description.toUpperCase(),
      photoUrl: editingProduct.photoUrl,
      barcode: editingProduct.barcode?.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consulta de Produtos</h1>
        <p className="text-muted-foreground mt-2">Busque e visualize informações dos produtos</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Input
          placeholder="Buscar por código ou descrição"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-lg h-12"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Results */}
      {searchQuery.length < 2 ? (
        <div className="text-center py-12 text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Buscando produtos...
        </div>
      ) : allResults.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allResults.map((product: any) => (
            <div
              key={product.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => {
                setSelectedProduct(product);
                setShowImageModal(true);
              }}
            >
              {/* Image */}
              <div className="relative bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
                {product.photoUrl ? (
                  <img
                    src={product.photoUrl}
                    alt={product.description}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-4xl text-gray-300">?</div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="font-mono font-semibold text-lg">{product.code}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </div>
                </div>

                {product.barcode && (
                  <div className="text-xs text-muted-foreground">
                    Barras: {product.barcode}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                  >
                    <Edit2 size={16} />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                      setShowHistoryModal(true);
                    }}
                  >
                    <History size={16} />
                    Histórico
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                  >
                    <Trash2 size={16} />
                    Deletar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.code} - {selectedProduct?.description}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {selectedProduct?.photoUrl ? (
              <img
                src={selectedProduct.photoUrl}
                alt={selectedProduct?.description}
                className="max-w-full max-h-96 object-contain"
              />
            ) : (
              <div className="w-96 h-96 bg-gray-100 flex items-center justify-center text-6xl text-gray-300">
                ?
              </div>
            )}
            <div className="text-sm text-muted-foreground w-full">
              <p><strong>Código:</strong> {selectedProduct?.code}</p>
              <p><strong>Descrição:</strong> {selectedProduct?.description}</p>
              {selectedProduct?.barcode && (
                <p><strong>Código de Barras:</strong> {selectedProduct.barcode}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Código *</label>
              <Input
                value={editingProduct?.code || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, code: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input
                value={editingProduct?.description || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código de Barras</label>
              <Input
                value={editingProduct?.barcode || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, barcode: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input
                value={editingProduct?.photoUrl || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, photoUrl: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateProductMutation2.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações - {selectedProduct?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {getHistoryQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (getHistoryQuery.data || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico encontrado
              </div>
            ) : (
              ((getHistoryQuery.data || []) as any[]).map((entry: any, idx: number) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{entry.movementType}</span>
                    <span className="text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Quantidade: {entry.quantity}
                  </div>
                  {entry.notes && (
                    <div className="text-muted-foreground mt-1">
                      Notas: {entry.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
