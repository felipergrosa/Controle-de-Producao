import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, AlertCircle, CheckCircle, Circle, ScanLine, Calendar, X, Search, Minus, Plus, Edit3, Camera } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { CameraScannerDialog } from "@/components/CameraScannerDialog";

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

type EntrySource =
  | "code_input"
  | "partial_search"
  | "barcode"
  | "camera"
  | "increment_button"
  | "decrement_button"
  | "manual_edit";

type SearchMode = "reader" | "camera" | "partial";

const MODE_ORDER: SearchMode[] = ["reader", "camera", "partial"];

const MODE_CONFIG: Record<
  SearchMode,
  {
    label: string;
    message: string;
    icon: LucideIcon;
    activeClasses: string;
    messageClasses: string;
  }
> = {
  reader: {
    label: "Modo leitor",
    message: "Modo leitor ativo",
    icon: ScanLine,
    activeClasses: "bg-red-600 text-white hover:bg-red-700 border-transparent",
    messageClasses: "bg-red-100 text-red-700 border-red-200",
  },
  camera: {
    label: "Câmera",
    message: "Modo câmera ativo",
    icon: Camera,
    activeClasses: "bg-orange-500 text-white hover:bg-orange-600 border-transparent",
    messageClasses: "bg-orange-100 text-orange-700 border-orange-200",
  },
  partial: {
    label: "Busca parcial",
    message: "Modo parcial ativo",
    icon: Search,
    activeClasses: "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent",
    messageClasses: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

export default function ProductionEntry() {
  const { user } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputValue, setDateInputValue] = useState("");

  const targetDate = customDate || today;
  const targetDateStr = format(targetDate, "dd/MM/yy", { locale: ptBR });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchMode, setActiveSearchMode] = useState<SearchMode | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineQuantity, setInlineQuantity] = useState<string>("");
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState("");
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [mobileModeAccordionOpen, setMobileModeAccordionOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInitializedDefaultReaderMode = useRef(false);

  // Utils para invalidação de cache
  const utils = trpc.useUtils();

  // Verificar se o dia está aberto
  const { data: dayStatus } = trpc.snapshots.getStatus.useQuery(
    { date: targetDate }
  );

  const isDayOpen = dayStatus?.isOpen ?? true;
  const isDayFinalized = !isDayOpen;

  // Queries
  const { data: summary = { totalItems: 0, totalQuantity: 0 } } = trpc.productionEntries.getSummary.useQuery(
    { date: targetDate }
  );

  const { data: entriesData } = trpc.productionEntries.getByDate.useQuery(
    { date: targetDate },
    { enabled: isDayOpen }
  );
  const safeEntriesData = entriesData && Array.isArray(entriesData) ? entriesData : [];

  // Busca parcial (quando checkbox ativo)
  const { data: searchResults = [] } = trpc.products.searchCombined.useQuery(
    { query: searchQuery },
    { enabled: activeSearchMode === "partial" && searchQuery.length >= 2 }
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

  const isProductChecked = useCallback(
    (productId: string | null | undefined) => {
      if (!productId) return false;
      return items.some((entry) => entry.productId === productId && entry.checked);
    },
    [items]
  );

  const searchPlaceholder = useMemo(() => {
    switch (activeSearchMode) {
      case "reader":
        return "Aponte o leitor para o código de barras e aperte o gatilho";
      case "camera":
        return "Use a câmera para escanear o código";
      case "partial":
        return "Digite código ou descrição e aperte Enter";
      default:
        return "Digite o código para buscar e aperte Enter";
    }
  }, [activeSearchMode]);

  const orderedModes = useMemo(() => {
    if (!activeSearchMode) {
      return MODE_ORDER;
    }
    return [
      activeSearchMode,
      ...MODE_ORDER.filter((mode) => mode !== activeSearchMode),
    ];
  }, [activeSearchMode]);

  const activeModeConfig = activeSearchMode
    ? MODE_CONFIG[activeSearchMode]
    : null;

  const defaultModeLabel = "Busca por código (padrão)";

  const activeModeLabel = activeModeConfig
    ? activeModeConfig.label
    : defaultModeLabel;

  const ActiveModeIcon = activeSearchMode
    ? MODE_CONFIG[activeSearchMode].icon
    : Search;

  const renderModeStatusBadge = (extraClassName?: string) => (
    <Badge
      className={cn(
        "text-sm font-medium border",
        activeModeConfig
          ? activeModeConfig.activeClasses
          : "bg-muted text-muted-foreground border-muted-foreground/50",
        extraClassName
      )}
    >
      {activeModeConfig ? activeModeConfig.message : defaultModeLabel}
    </Badge>
  );

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
      if (isProductChecked(product.id)) {
        toast.error("Este produto já foi conferido e não pode ser alterado.");
        setSearchQuery("");
        focusSearchInput();
        return;
      }
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
    if (isProductChecked(product.id)) {
      toast.error("Este produto já foi conferido e não pode ser alterado.");
      setSearchQuery("");
      focusSearchInput();
      return;
    }
    setSelectedProduct(product);
    setQuantity("1");
    setShowQuantityModal(true);
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeSearchMode === "reader") {
      if (e.key === "Enter") {
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeSearchMode !== "partial") {
        handleSearch();
      }
    }
  };

  const handleAddProduct = async (source: EntrySource = "code_input") => {
    if (!selectedProduct) return;

    if (isProductChecked(selectedProduct.id)) {
      toast.error("Este produto já foi conferido e não pode ser alterado.");
      return;
    }

    const qty = parseInt(quantity) || 0;
    if (qty < 1) {
      toast.error("Quantidade deve ser maior que 0");
      return;
    }

    if (isDayFinalized) {
      toast.error("Não é possível adicionar itens em dia finalizado");
      return;
    }

    try {
      await addEntryMutation.mutateAsync({
        productId: selectedProduct.id,
        productCode: selectedProduct.code,
        productDescription: selectedProduct.description,
        photoUrl: selectedProduct.photoUrl || undefined,
        quantity: qty,
        sessionDate: targetDate,
        grouping: true,
        source,
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
      handleAddProduct("manual_edit");
    }
  };

  const handleAdjustQuantity = async (item: ProductionItem, delta: number) => {
    if (isDayFinalized) {
      toast.error("Não é possível alterar itens em dia finalizado");
      return;
    }
    if (item.checked) {
      toast.error("Este item já foi conferido e não pode ser alterado.");
      return;
    }
    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 1) {
      toast.error("Quantidade mínima é 1");
      return;
    }
    try {
      await updateEntryMutation.mutateAsync({
        id: item.id,
        quantity: nextQuantity,
        source: delta > 0 ? "increment_button" : "decrement_button",
      });
    } catch (error) {
      toast.error("Erro ao ajustar quantidade");
    }
  };

  const startInlineEdit = (item: ProductionItem) => {
    if (isDayFinalized) {
      toast.error("Não é possível alterar itens em dia finalizado");
      return;
    }
    if (item.checked) {
      toast.error("Este item já foi conferido e não pode ser alterado.");
      return;
    }
    setInlineEditId(item.id);
    setInlineQuantity(item.quantity.toString());
  };

  const commitInlineEdit = async () => {
    if (!inlineEditId) return;
    const item = items.find((entry) => entry.id === inlineEditId);
    if (!item) {
      setInlineEditId(null);
      return;
    }
    const parsed = parseInt(inlineQuantity, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Informe uma quantidade válida (mínimo 1)");
      return;
    }
    if (parsed === item.quantity) {
      setInlineEditId(null);
      return;
    }
    try {
      await updateEntryMutation.mutateAsync({
        id: item.id,
        quantity: parsed,
        source: "manual_edit",
      });
      setInlineEditId(null);
    } catch (error) {
      toast.error("Erro ao atualizar quantidade");
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineQuantity("");
  };

  useEffect(() => {
    if (!inlineEditId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelInlineEdit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inlineEditId]);

  const playBeep = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 1100;

      const now = ctx.currentTime;

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.2);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error("Erro ao reproduzir beep", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx?.close) {
        void ctx.close().catch(() => undefined);
      }
    };
  }, []);

  const addProductByCode = async (rawCode: string, source: EntrySource) => {
    const code = rawCode.trim();
    if (!code) return;

    if (isDayFinalized) {
      toast.error("Não é possível adicionar itens em dia finalizado");
      return;
    }

    const product = await findProductByCode(code);
    if (!product) {
      setNotFoundCode(code);
      setShowNotFoundModal(true);
      return;
    }

    if (isProductChecked(product.id)) {
      toast.error("Este produto já foi conferido e não pode ser alterado.");
      return;
    }

    try {
      await addEntryMutation.mutateAsync({
        productId: product.id,
        productCode: product.code,
        productDescription: product.description,
        photoUrl: product.photoUrl || undefined,
        quantity: 1,
        sessionDate: targetDate,
        grouping: true,
        source,
      });
      void playBeep();
      toast.success(`Produto ${product.code} lançado`);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao adicionar produto");
    }
  };

  const handleBarcodeScan = async (rawCode: string) => {
    await addProductByCode(rawCode, "barcode");
  };

  const handleCameraDetected = async (code: string) => {
    await addProductByCode(code, "camera");
  };

  const resetBarcodeBuffer = () => {
    barcodeBufferRef.current = "";
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
      barcodeTimeoutRef.current = null;
    }
  };

  const focusSearchInput = () => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  useEffect(() => {
    console.log("[ProductionEntry] cameraScannerOpen", cameraScannerOpen);
  }, [cameraScannerOpen]);

  useEffect(() => {
    console.log("[ProductionEntry] activeSearchMode", activeSearchMode);
  }, [activeSearchMode]);

  useEffect(() => {
    if (activeSearchMode !== "partial") {
      setMobileModeAccordionOpen(false);
    }
  }, [activeSearchMode]);

  useEffect(() => {
    focusSearchInput();
  }, []);

  useEffect(() => {
    if (!hasInitializedDefaultReaderMode.current && user) {
      setActiveSearchMode(user.defaultReaderMode ? "reader" : null);
      hasInitializedDefaultReaderMode.current = true;
    }
  }, [user]);

  const handleCloseNotFoundModal = () => {
    setShowNotFoundModal(false);
    focusSearchInput();
  };

  useEffect(() => {
    if (activeSearchMode !== "reader") {
      resetBarcodeBuffer();
      return;
    }

    const handleKeyDownGlobal = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingField = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

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
  }, [activeSearchMode]);

  const activateMode = (mode: SearchMode) => {
    if (isDayFinalized) {
      toast.error("Não é possível alterar modos em dia finalizado");
      return;
    }

    console.log("[ProductionEntry] activateMode called", { mode, activeSearchMode });

    if (activeSearchMode === mode) {
      if (mode === "camera") {
        setCameraScannerOpen(false);
      }
      focusSearchInput();
      toast.info("Voltando para busca por código (padrão).");
      setActiveSearchMode(null);
      setMobileModeAccordionOpen(false);
      return;
    }

    switch (mode) {
      case "reader":
        searchInputRef.current?.blur();
        toast.info("Modo leitor ativo. Escaneie o código para lançar quantidade 1.");
        break;
      case "camera":
        searchInputRef.current?.blur();
        toast.info("Modo câmera ativo. Aguarde a abertura do scanner.");
        break;
      case "partial":
        focusSearchInput();
        toast.info("Modo parcial ativo. Digite ao menos 2 caracteres para buscar.");
        break;
    }

    setActiveSearchMode(mode);
    setCameraScannerOpen(mode === "camera");
    setMobileModeAccordionOpen(false);
  };

  const handleDateSelection = () => {
    if (!dateInputValue) {
      toast.error("Selecione uma data");
      return;
    }
    const selectedDate = new Date(dateInputValue + "T00:00:00");
    setCustomDate(selectedDate);
    setShowDatePicker(false);
    toast.success(`Data alterada para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`);
  };

  const handleClearCustomDate = () => {
    setCustomDate(null);
    setDateInputValue("");
    toast.info("Voltando para o dia de hoje");
  };

  const handleDeleteItem = async (item: ProductionItem) => {
    if (isDayFinalized) {
      toast.error("Não é possível remover itens em dia finalizado");
      return;
    }
    if (item.checked) {
      toast.error("Este item já foi conferido e não pode ser alterado.");
      return;
    }
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
        <p className="text-muted-foreground mt-2">
          Registre a produção do dia {targetDateStr}
        </p>
      </div>

      {/* Alerta de dia finalizado */}
      {isDayFinalized && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este dia está finalizado. Não é possível adicionar ou editar itens. Solicite a reabertura a um administrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de data customizada */}
      {customDate && (
        <Alert className="border-blue-200 bg-blue-50">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-900">
              Lançando produção para: <strong>{format(customDate, "dd/MM/yyyy", { locale: ptBR })}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCustomDate}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
              Voltar para hoje
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Section */}
      <Card className="border border-border/60 shadow-none">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Label htmlFor="search" className="text-base font-semibold">Buscar Produto</Label>
            <div className="hidden md:flex items-center gap-2">
              {renderModeStatusBadge()}
              <div className="flex flex-wrap items-center gap-2">
                {orderedModes.map((mode) => {
                  const config = MODE_CONFIG[mode];
                  const isActive = activeSearchMode === mode;
                  const Icon = config.icon;
                  return (
                    <Button
                      key={mode}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => activateMode(mode)}
                      disabled={isDayFinalized}
                      className={cn(
                        "whitespace-nowrap",
                        isActive ? config.activeClasses : undefined
                      )}
                      size="sm"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant={customDate ? "default" : "outline"}
                onClick={() => setShowDatePicker(true)}
                className="whitespace-nowrap"
                size="sm"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Escolher data
              </Button>
            </div>
          </div>

          <div className="md:hidden space-y-2">
            <Accordion
              type="single"
              collapsible
              value={mobileModeAccordionOpen ? "mode-selector" : ""}
              onValueChange={(value) => setMobileModeAccordionOpen(value === "mode-selector")}
              className="border rounded-lg"
            >
              <AccordionItem value="mode-selector" className="border-b-0">
                <AccordionTrigger className="px-4 py-3">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2 text-base font-medium">
                      <ActiveModeIcon className="h-4 w-4" />
                      {activeModeLabel}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-2 pb-4">
                  <div className="flex flex-col gap-2">
                    {orderedModes.map((mode) => {
                      const config = MODE_CONFIG[mode];
                      const isActive = activeSearchMode === mode;
                      const Icon = config.icon;
                      return (
                        <Button
                          key={mode}
                          type="button"
                          variant="outline"
                          disabled={isDayFinalized}
                          className={cn(
                            "justify-start",
                            isActive && config.activeClasses
                          )}
                          onClick={() => {
                            activateMode(mode);
                            setMobileModeAccordionOpen(false);
                          }}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {config.label}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant={customDate ? "default" : "outline"}
                      onClick={() => {
                        setShowDatePicker(true);
                        setMobileModeAccordionOpen(false);
                      }}
                      className="justify-start"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Escolher data
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {renderModeStatusBadge("w-full justify-center")}
          </div>

          <Input
            id="search"
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-base w-full"
            disabled={isDayFinalized}
          />

          {/* Resultados da busca parcial */}
          {activeSearchMode === "partial" && searchQuery.length >= 2 && (
            <div className="border-t pt-3">
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

      {/* Date Picker Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="w-full max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Escolher Data de Lançamento</DialogTitle>
            <DialogDescription>
              Selecione a data em que deseja lançar a produção. Não é possível lançar em dias finalizados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="date-input">Data</Label>
            <Input
              id="date-input"
              type="date"
              value={dateInputValue}
              onChange={(e) => setDateInputValue(e.target.value)}
              max={format(today, "yyyy-MM-dd")}
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDatePicker(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDateSelection}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Found Modal */}
      <Dialog
        open={showNotFoundModal}
        onOpenChange={(open) => {
          setShowNotFoundModal(open);
          if (!open) {
            focusSearchInput();
          }
        }}
      >
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
            <Button onClick={handleCloseNotFoundModal}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner */}
      <CameraScannerDialog
        open={cameraScannerOpen}
        onClose={() => {
          setCameraScannerOpen(false);
          if (activeSearchMode === "camera") {
            focusSearchInput();
          }
        }}
        onDetected={handleCameraDetected}
      />

      {activeSearchMode === "camera" && !isDayFinalized && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 transform">
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30"
            onClick={() => {
              setCameraScannerOpen(true);
            }}
            disabled={cameraScannerOpen}
            aria-label="Reabrir câmera"
          >
            <Camera className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Quantity Modal */}
      <Dialog open={showQuantityModal} onOpenChange={(open) => !open && setShowQuantityModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informar Quantidade</DialogTitle>
            <DialogDescription className="space-y-1">
              <span className="block text-lg font-semibold text-primary">
                {selectedProduct?.code}
              </span>
              <span className="block text-sm leading-snug text-muted-foreground">
                {selectedProduct?.description}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="quantity" className="text-base">Quantidade</Label>
            <Input
              id="quantity"
              ref={quantityInputRef}
              type="number"
              min="1"
              inputMode="numeric"
              pattern="[0-9]*"
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
              onClick={() => {
                void handleAddProduct();
              }}
              disabled={addEntryMutation.isPending}
            >
              {addEntryMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items List */}
      <Card>
        <CardContent className="pt-0">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Itens Lançados</h2>
            <div className="text-sm text-muted-foreground mt-1">
              Produção de {targetDateStr}
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
            <div className="space-y-3">
              <div className="md:hidden space-y-3">
                {items.map((item) => {
                  const ModeIcon = item.checked ? CheckCircle : Circle;
                  const insertedAt = format(new Date(item.insertedAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
                  const checkedInfo = item.checked && item.checkedAt
                    ? [
                        item.checkedByName ? `por ${item.checkedByName}` : null,
                        `em ${format(new Date(item.checkedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : null;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border p-3 shadow-xs space-y-2",
                        item.checked ? "border-green-400/70 bg-green-50" : "border-amber-300/60 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ModeIcon className={cn("h-5 w-5", item.checked ? "text-green-600" : "text-yellow-600")} />
                          <div className="space-y-0.5">
                            <p className="text-base font-semibold leading-snug">{item.productCode}</p>
                            <p className={cn("text-base font-semibold leading-snug text-muted-foreground", item.checked && "line-through")}>{item.productDescription}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                          disabled={isDayFinalized}
                          className="h-8 w-8 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-muted-foreground">Quantidade</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-border/70"
                              onClick={() => handleAdjustQuantity(item, -1)}
                              disabled={isDayFinalized || updateEntryMutation.isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            {inlineEditId === item.id ? (
                              <input
                                className="w-16 rounded-md border border-border bg-white px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                value={inlineQuantity}
                                onChange={(e) => setInlineQuantity(e.target.value.replace(/\D+/g, ""))}
                                onBlur={commitInlineEdit}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    commitInlineEdit();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item)}
                                className="group inline-flex min-w-[3rem] items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-foreground shadow-sm transition hover:bg-primary/10"
                                disabled={isDayFinalized}
                              >
                                <span>{item.quantity}</span>
                                <Edit3 className="ml-1 h-3 w-3 opacity-0 transition group-hover:opacity-70" />
                              </button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-border/70"
                              onClick={() => handleAdjustQuantity(item, 1)}
                              disabled={isDayFinalized || updateEntryMutation.isPending}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-xs uppercase text-muted-foreground">Inserido em</span>
                          <div className="mt-1 flex flex-wrap gap-x-2 text-sm">
                            <span className="font-medium">{insertedAt}</span>
                            {item.createdByName && (
                              <span className="text-muted-foreground">por {item.createdByName}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                              item.checked ? "bg-green-600 text-white" : "bg-yellow-500 text-white"
                            )}
                          >
                            {item.checked ? "Conferido" : "Aguardando"}
                          </span>
                          {checkedInfo && <span className="text-xs text-muted-foreground">{checkedInfo}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[60px] text-center">Qtd</TableHead>
                      <TableHead className="w-[140px] text-center">Inserido em</TableHead>
                      <TableHead className="w-[140px] text-center">Conferido</TableHead>
                      <TableHead className="w-[60px] text-center">Ações</TableHead>
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
                        <TableCell className="text-center font-bold">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-border/70"
                              onClick={() => handleAdjustQuantity(item, -1)}
                              disabled={isDayFinalized || updateEntryMutation.isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            {inlineEditId === item.id ? (
                              <input
                                className="w-16 rounded-md border border-border bg-white px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                value={inlineQuantity}
                                onChange={(e) => setInlineQuantity(e.target.value.replace(/\D+/g, ""))}
                                onBlur={commitInlineEdit}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    commitInlineEdit();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item)}
                                className="group inline-flex min-w-[3rem] items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-foreground shadow-sm transition hover:bg-primary/10"
                                disabled={isDayFinalized}
                              >
                                <span>{item.quantity}</span>
                                <Edit3 className="ml-1 h-3 w-3 opacity-0 transition group-hover:opacity-70" />
                              </button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-border/70"
                              onClick={() => handleAdjustQuantity(item, 1)}
                              disabled={isDayFinalized || updateEntryMutation.isPending}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
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
                                item.checked ? "text-green-600" : "text-yellow-600"
                              }`}
                            >
                              {item.checked ? "Sim" : "Não"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.checked
                                ? item.checkedByName
                                  ? `Conferido por ${item.checkedByName}`
                                  : ""
                                : "Aguardando conferência"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.checked && item.checkedAt
                                ? format(new Date(item.checkedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "--"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            disabled={isDayFinalized}
                            className="h-8 w-8 p-0 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
