import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CameraScannerDialog } from "@/components/CameraScannerDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pencil,
  Calendar, 
  Scale, 
  UserPlus, 
  FileText,
  HelpCircle,
  TrendingDown,
  Percent,
  X,
  Keyboard,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ScanLine,
  Camera,
  Search,
  AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HelpTooltip } from "@/components/HelpTooltip";

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const hrs = parts[0] || 0;
  const mins = parts[1] || 0;
  return hrs * 60 + mins;
}

function adjustTime(currentTime: string, type: "hour" | "minute", amount: number): string {
  if (!currentTime) currentTime = "00:00";
  const [h, m] = currentTime.split(":").map(Number);
  let newH = h;
  let newM = m;

  if (type === "hour") {
    newH = (h + amount + 24) % 24;
  } else {
    newM = (m + amount + 60) % 60;
  }

  const hStr = String(newH).padStart(2, "0");
  const mStr = String(newM).padStart(2, "0");
  return `${hStr}:${mStr}`;
}

function RetroDigitalClock({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [h, m] = value.split(":").map(Number);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const incrementHour = (amount: number) => {
    onChange(adjustTime(value, "hour", amount));
  };

  const incrementMinute = (amount: number) => {
    onChange(adjustTime(value, "minute", amount));
  };

  // Funções de arrasto (Touch / Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent, type: "hour" | "minute") => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = touchStartY - currentY;

    if (Math.abs(diffY) > 20) { // Sensibilidade de 20px
      const amount = diffY > 0 ? 1 : -1; // Cima -> incrementa (+1), Baixo -> decrementa (-1)
      if (type === "hour") {
        incrementHour(amount);
      } else {
        incrementMinute(amount * 5); // minutos de 5 em 5 para o drag
      }
      setTouchStartY(currentY); // Atualiza ponto de partida para rolagem contínua
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  // Funções de arrasto no desktop (Mouse Drag)
  const [mouseStartY, setMouseStartY] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent, type: "hour" | "minute") => {
    if (mouseStartY === null) return;
    const currentY = e.clientY;
    const diffY = mouseStartY - currentY;

    if (Math.abs(diffY) > 20) {
      const amount = diffY > 0 ? 1 : -1;
      if (type === "hour") {
        incrementHour(amount);
      } else {
        incrementMinute(amount * 5);
      }
      setMouseStartY(currentY);
    }
  };

  const handleMouseUpOrLeave = () => {
    setMouseStartY(null);
  };

  return (
    <div className="flex flex-col items-center p-3 bg-slate-100/80 rounded-xl border border-slate-200/80 shadow-xs w-[165px] select-none text-slate-800">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
      
      <div className="flex items-center gap-2">
        {/* Bloco de Horas */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => incrementHour(1)}
            className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, "hour")}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => handleMouseMove(e, "hour")}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="w-14 h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-mono text-3xl font-extrabold tracking-wider shadow-inner cursor-ns-resize"
            title="Arraste para cima/baixo para ajustar a hora"
          >
            {String(h).padStart(2, "0")}
          </div>

          <button
            type="button"
            onClick={() => incrementHour(-1)}
            className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Separador Piscante */}
        <div className="text-slate-400 font-mono text-2xl font-bold pb-2 animate-pulse">:</div>

        {/* Bloco de Minutos */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => incrementMinute(5)}
            className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, "minute")}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => handleMouseMove(e, "minute")}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="w-14 h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-mono text-3xl font-extrabold tracking-wider shadow-inner cursor-ns-resize"
            title="Arraste para cima/baixo para ajustar os minutos"
          >
            {String(m).padStart(2, "0")}
          </div>

          <button
            type="button"
            onClick={() => incrementMinute(-5)}
            className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
      <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold">Arraste para rolar</span>
    </div>
  );
}

type SearchMode = "reader" | "camera" | "partial";

const MODE_ORDER: SearchMode[] = ["reader", "camera", "partial"];

const MODE_CONFIG: Record<
  SearchMode,
  {
    label: string;
    message: string;
    icon: any;
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

interface ParadaInput {
  tempoMinutos: number;
  motivo: string;
  motivoParadaId?: number;
  causaQuebraId?: number;
}

export default function LancamentoRepuxados() {
  const { user } = useAuth();
  const today = new Date();
  
  // States do formulário
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
  const [repuxadorId, setRepuxadorId] = useState("");
  const [dataProducao, setDataProducao] = useState(format(today, "yyyy-MM-dd"));
  const [turno, setTurno] = useState("Turno A");
  const [horaInicio, setHoraInicio] = useState("07:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [pecasProduzidas, setPecasProduzidas] = useState("");
  const [pecasQuebradas, setPecasQuebradas] = useState("0");
  const [causaQuebraId, setCausaQuebraId] = useState("");
  const [obs, setObs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // States extras para o controle de relógio móvel
  const [showManualTime, setShowManualTime] = useState(false);
  const [causaModalOrigin, setCausaModalOrigin] = useState<"quebra" | "parada">("quebra");

  // States para busca integrada de produtos (mesmo padrão do ProductionEntry)
  const [activeSearchMode, setActiveSearchMode] = useState<SearchMode | null>(null);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState("");
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputValue, setDateInputValue] = useState("");
  const [mobileModeAccordionOpen, setMobileModeAccordionOpen] = useState(false);

  // Refs para leitor de código de barras físico
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastNonCameraModeRef = useRef<SearchMode | null>("reader");
  const hasInitializedDefaultReaderMode = useRef(false);
  
  // Paradas associadas
  const [paradas, setParadas] = useState<ParadaInput[]>([]);
  const [tempParadaMin, setTempParadaMin] = useState("");
  const [tempParadaCausaId, setTempParadaCausaId] = useState("");

  // Modais de Cadastro Rápido
  const [showRepuxadorModal, setShowRepuxadorModal] = useState(false);
  const [newRepuxadorNome, setNewRepuxadorNome] = useState("");
  const [newRepuxadorMatricula, setNewRepuxadorMatricula] = useState("");
  const [newRepuxadorTurno, setNewRepuxadorTurno] = useState("Turno A");

  const [showCausaModal, setShowCausaModal] = useState(false);
  const [newCausaDescricao, setNewCausaDescricao] = useState("");

  // Queries
  const utils = trpc.useUtils();
  const repuxadoresQuery = trpc.repuxadores.list.useQuery();
  const causasQuery = trpc.causasQuebra.list.useQuery();
  const motivosParadaQuery = trpc.motivosParada.list.useQuery();
  const produtosQuery = trpc.products.list.useQuery();
  const motivosFrequentesQuery = trpc.repuxados.getMotivosParadaFrequentes.useQuery();
  
  const filteredProducts = useMemo(() => {
    if (!produtosQuery.data) return [];
    const term = productSearch.trim().toLowerCase();
    if (!term) return produtosQuery.data.slice(0, 15);
    return produtosQuery.data.filter(p => 
      p.code.toLowerCase().includes(term) || 
      p.description.toLowerCase().includes(term)
    );
  }, [productSearch, produtosQuery.data]);

  // Lançamentos do dia selecionado
  const selectedDateObject = useMemo(() => {
    return new Date(dataProducao + "T12:00:00");
  }, [dataProducao]);

  const lancamentosQuery = trpc.repuxados.getByDateRange.useQuery({
    startDate: selectedDateObject,
    endDate: selectedDateObject
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedLancamentos = useMemo(() => {
    if (!lancamentosQuery.data) return [];
    const items = [...lancamentosQuery.data];
    if (!sortField) return items;

    return items.sort((a: any, b: any) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Tratamento especial para colunas calculadas
      if (sortField === "pecasQuebradasPct") {
        aVal = a.pecasProduzidas > 0 ? (a.pecasQuebradas / a.pecasProduzidas) : 0;
        bVal = b.pecasProduzidas > 0 ? (b.pecasQuebradas / b.pecasProduzidas) : 0;
      } else if (sortField === "tempoParadas") {
        aVal = a.paradas.reduce((acc: number, cur: any) => acc + cur.tempoMinutos, 0);
        bVal = b.paradas.reduce((acc: number, cur: any) => acc + cur.tempoMinutos, 0);
      } else if (sortField === "pesoKg") {
        const aPeso = Number(a.pesoUnitarioG || 0);
        const bPeso = Number(b.pesoUnitarioG || 0);
        aVal = (a.pecasProduzidas * aPeso) / 1000;
        bVal = (b.pecasProduzidas * bPeso) / 1000;
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
        : (bVal > aVal ? 1 : bVal < aVal ? -1 : 0);
    });
  }, [lancamentosQuery.data, sortField, sortDirection]);

  // Estatísticas Rápidas de hoje
  const statsQuery = trpc.repuxados.getStats.useQuery({
    startDate: selectedDateObject,
    endDate: selectedDateObject
  });

  // Mutations
  const createLancamento = trpc.repuxados.create.useMutation({
    onSuccess: () => {
      toast.success("Lançamento de repuxo salvo com sucesso!");
      // Resetar form parcial
      setPecasProduzidas("");
      setPecasQuebradas("0");
      setCausaQuebraId("");
      setObs("");
      setParadas([]);
      setProductSearch("");
      
      // Invalidações
      utils.repuxados.getByDateRange.invalidate();
      utils.repuxados.getStats.invalidate();
      utils.products.list.invalidate();
      utils.motivosParada.list.invalidate();
      utils.repuxados.getMotivosParadaFrequentes.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar lançamento");
    }
  });

  const deleteLancamento = trpc.repuxados.delete.useMutation({
    onSuccess: () => {
      toast.success("Lançamento removido!");
      utils.repuxados.getByDateRange.invalidate();
      utils.repuxados.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao remover lançamento");
    }
  });

  const updateLancamento = trpc.repuxados.update.useMutation({
    onSuccess: () => {
      toast.success("Lançamento de repuxo atualizado com sucesso!");
      setEditingId(null);
      setProductId("");
      setPecasProduzidas("");
      setPecasQuebradas("0");
      setCausaQuebraId("");
      setObs("");
      setParadas([]);
      setProductSearch("");
      
      utils.repuxados.getByDateRange.invalidate();
      utils.repuxados.getStats.invalidate();
      utils.products.list.invalidate();
      utils.motivosParada.list.invalidate();
      utils.repuxados.getMotivosParadaFrequentes.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar lançamento");
    }
  });

  const createRepuxadorMutation = trpc.repuxadores.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Repuxador ${data.nome} criado!`);
      setRepuxadorId(String(data.id));
      setShowRepuxadorModal(false);
      setNewRepuxadorNome("");
      setNewRepuxadorMatricula("");
      utils.repuxadores.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar operador");
    }
  });

  const createCausaMutation = trpc.causasQuebra.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Causa "${data.descricao}" cadastrada!`);
      setCausaQuebraId(String(data.id));
      setShowCausaModal(false);
      setNewCausaDescricao("");
      utils.causasQuebra.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar causa");
    }
  });

  const createMotivoParadaMutation = trpc.motivosParada.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Motivo de parada "${data.descricao}" cadastrado!`);
      setTempParadaCausaId(String(data.id));
      setShowCausaModal(false);
      setNewCausaDescricao("");
      utils.motivosParada.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar motivo de parada");
    }
  });

  // Busca combinada do trpc para o autocomplete e busca exata (mesmo padrão de ProductionEntry)
  const { data: searchResults = [] } = trpc.products.searchCombined.useQuery(
    { query: productSearch },
    { enabled: activeSearchMode === "partial" && productSearch.length >= 2 }
  );

  // Utilitários de Beep (mesmo de ProductionEntry)
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
    if (!productSearch.trim()) return;

    const product = await findProductByCode(productSearch);

    if (product) {
      setProductId(product.id);
      setProductSearch("");
      void playBeep();
      toast.success(`Produto ${product.code} selecionado`);
      focusSearchInput();
    } else {
      setNotFoundCode(productSearch.trim());
      setShowNotFoundModal(true);
    }
  };

  const selectProductByCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const product = await findProductByCode(code);
    if (!product) {
      setNotFoundCode(code);
      setShowNotFoundModal(true);
      return;
    }

    setProductId(product.id);
    setProductSearch("");
    void playBeep();
    toast.success(`Produto ${product.code} selecionado`);
    focusSearchInput();
  };

  const handleBarcodeScan = async (rawCode: string) => {
    await selectProductByCode(rawCode);
  };

  const handleCameraDetected = async (code: string) => {
    await selectProductByCode(code);
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

  const handleCloseNotFoundModal = () => {
    setShowNotFoundModal(false);
    focusSearchInput();
  };

  const handleDateSelection = () => {
    if (!dateInputValue) {
      toast.error("Selecione uma data");
      return;
    }
    setDataProducao(dateInputValue);
    setShowDatePicker(false);
    toast.success(`Data alterada para ${format(new Date(dateInputValue + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`);
  };

  useEffect(() => {
    focusSearchInput();
  }, []);

  useEffect(() => {
    if (!hasInitializedDefaultReaderMode.current && user) {
      setActiveSearchMode(user.defaultReaderMode ? "reader" : null);
      hasInitializedDefaultReaderMode.current = true;
    }
  }, [user]);

  useEffect(() => {
    if (activeSearchMode !== "partial") {
      setMobileModeAccordionOpen(false);
    }
  }, [activeSearchMode]);

  useEffect(() => {
    if (activeSearchMode !== "reader") {
      resetBarcodeBuffer();
      return;
    }

    const handleKeyDownGlobal = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingField = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      // Se for um campo de texto que não seja o nosso input de busca, deixa o comportamento normal
      if (isTypingField && activeElement !== searchInputRef.current && !event.key.startsWith("F")) {
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
        toast.info("Modo leitor ativo. Escaneie o código do produto.");
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

    if (mode === "camera") {
      lastNonCameraModeRef.current = activeSearchMode ?? lastNonCameraModeRef.current ?? "reader";
    } else {
      lastNonCameraModeRef.current = mode;
    }

    setActiveSearchMode(mode);
    setCameraScannerOpen(mode === "camera");
    setMobileModeAccordionOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const searchPlaceholder = useMemo(() => {
    switch (activeSearchMode) {
      case "reader":
        return "Aponte o leitor para o código de barras do produto";
      case "camera":
        return "Use a câmera para escanear o código do produto";
      case "partial":
        return "Digite código ou descrição e selecione o produto";
      default:
        return "Digite o código do produto e aperte Enter";
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

  // Encontrar produto selecionado
  const selectedProduct = useMemo(() => {
    return produtosQuery.data?.find((p) => p.id === productId);
  }, [productId, produtosQuery.data]);

  // Cálculos Automáticos
  const tempoDuraçãoMinutos = useMemo(() => {
    if (!horaInicio || !horaFim) return 0;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Passagem de dia
    return diff;
  }, [horaInicio, horaFim]);

  const tempoParadasTotal = useMemo(() => {
    return paradas.reduce((acc, cur) => acc + cur.tempoMinutos, 0);
  }, [paradas]);

  const tempoOperacaoEfetiva = useMemo(() => {
    return Math.max(0, tempoDuraçãoMinutos - tempoParadasTotal);
  }, [tempoDuraçãoMinutos, tempoParadasTotal]);

  const calcKgTotal = useMemo(() => {
    const pecas = Number(pecasProduzidas) || 0;
    const peso = Number(selectedProduct?.pesoUnitarioG) || 0;
    return (pecas * peso) / 1000;
  }, [pecasProduzidas, selectedProduct]);

  const calcKgQuebra = useMemo(() => {
    const pecasQ = Number(pecasQuebradas) || 0;
    const peso = Number(selectedProduct?.pesoUnitarioG) || 0;
    return (pecasQ * peso) / 1000;
  }, [pecasQuebradas, selectedProduct]);

  const calcPctQuebra = useMemo(() => {
    const total = Number(pecasProduzidas) || 0;
    const quebra = Number(pecasQuebradas) || 0;
    if (total <= 0) return 0;
    return (quebra / total) * 100;
  }, [pecasProduzidas, pecasQuebradas]);

  const calcEficiencia = useMemo(() => {
    const ideal = Number(selectedProduct?.idealPecasHora) || 0;
    const produzidas = Number(pecasProduzidas) || 0;
    if (ideal <= 0 || tempoOperacaoEfetiva <= 0) return null;
    const pecasEsperadas = (tempoOperacaoEfetiva / 60) * ideal;
    return (produzidas / pecasEsperadas) * 100;
  }, [pecasProduzidas, selectedProduct, tempoOperacaoEfetiva]);

  // Alertas
  const alertaQuebra = useMemo(() => {
    const maxQuebra = Number(selectedProduct?.metaQuebraPct) || 0;
    if (maxQuebra > 0 && calcPctQuebra > maxQuebra) {
      return `Taxa de quebra (${calcPctQuebra.toFixed(2)}%) acima da meta de ${maxQuebra.toFixed(2)}% do produto!`;
    }
    return null;
  }, [calcPctQuebra, selectedProduct]);

  const alertaEficiencia = useMemo(() => {
    if (calcEficiencia !== null && calcEficiencia < 80) {
      return `Eficiência (${calcEficiencia.toFixed(1)}%) abaixo do esperado (Ideal: ${selectedProduct?.idealPecasHora} p/h).`;
    }
    return null;
  }, [calcEficiencia, selectedProduct]);

  // Handlers
  const handleAddParada = () => {
    const tempo = parseInt(tempParadaMin);
    if (isNaN(tempo) || tempo <= 0) {
      toast.warning("Informe um tempo de parada válido em minutos");
      return;
    }
    if (tempo > tempoDuraçãoMinutos - tempoParadasTotal) {
      toast.warning("O tempo de paradas não pode superar a duração total do turno");
      return;
    }

    if (!tempParadaCausaId) {
      toast.warning("Selecione uma causa da lista");
      return;
    }
    const finalMotivoParadaId = Number(tempParadaCausaId);
    const motivoObj = motivosParadaQuery.data?.find(m => m.id === finalMotivoParadaId);
    const finalMotivo = motivoObj ? motivoObj.descricao : "Parada registrada";

    setParadas([...paradas, {
      tempoMinutos: tempo,
      motivo: finalMotivo,
      motivoParadaId: finalMotivoParadaId
    }]);

    setTempParadaMin("");
    setTempParadaCausaId("");
  };

  const handleRemoveParada = (index: number) => {
    setParadas(paradas.filter((_, idx) => idx !== index));
  };

  const handleSalvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error("Selecione um Produto");
      return;
    }
    if (!repuxadorId) {
      toast.error("Selecione um Operador/Repuxador");
      return;
    }
    const totalP = parseInt(pecasProduzidas);
    if (isNaN(totalP) || totalP <= 0) {
      toast.error("Quantidade de peças produzidas deve ser maior que 0");
      return;
    }
    const quebradas = parseInt(pecasQuebradas);
    if (isNaN(quebradas) || quebradas < 0) {
      toast.error("Quantidade de quebras não pode ser negativa");
      return;
    }
    if (quebradas > totalP) {
      toast.error("As quebras não podem ser maiores que a produção total");
      return;
    }
    if (quebradas > 0 && !causaQuebraId) {
      toast.error("Se houver peças quebradas, você deve especificar uma causa");
      return;
    }

    const basePayload = {
      productId,
      repuxadorId: Number(repuxadorId),
      dataProducao: selectedDateObject,
      turno,
      horaInicio,
      horaFim,
      pecasProduzidas: totalP,
      pecasQuebradas: quebradas,
    };

    if (editingId) {
      await updateLancamento.mutateAsync({
        id: editingId,
        ...basePayload,
        causaQuebraId: causaQuebraId ? Number(causaQuebraId) : null,
        obs: obs || null,
        paradas: paradas.map(p => ({
          tempoMinutos: p.tempoMinutos,
          motivo: p.motivo || null,
          motivoParadaId: p.motivoParadaId || null
        }))
      });
    } else {
      await createLancamento.mutateAsync({
        ...basePayload,
        causaQuebraId: causaQuebraId ? Number(causaQuebraId) : undefined,
        obs: obs || undefined,
        paradas: paradas.map(p => ({
          tempoMinutos: p.tempoMinutos,
          motivo: p.motivo || undefined,
          motivoParadaId: p.motivoParadaId
        }))
      });
    }
  };

  const handleDeletarLancamento = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento de produção?")) {
      await deleteLancamento.mutateAsync({ id });
    }
  };

  const handleEditarClick = (l: any) => {
    setEditingId(l.id);
    setProductId(l.productId);
    setProductSearch(l.productCode);
    setRepuxadorId(String(l.repuxadorId));
    setTurno(l.turno);
    setHoraInicio(l.horaInicio);
    setHoraFim(l.horaFim);
    setPecasProduzidas(String(l.pecasProduzidas));
    setPecasQuebradas(String(l.pecasQuebradas));
    setCausaQuebraId(l.causaQuebraId ? String(l.causaQuebraId) : "");
    setObs(l.obs || "");
    setParadas(l.paradas.map((p: any) => ({
      tempoMinutos: p.tempoMinutos,
      motivo: p.motivo || "",
      motivoParadaId: p.motivoParadaId
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info("Lançamento carregado para edição no formulário!");
  };

  const handleSaveRepuxador = async () => {
    if (!newRepuxadorNome) {
      toast.error("O nome é obrigatório");
      return;
    }
    await createRepuxadorMutation.mutateAsync({
      nome: newRepuxadorNome,
      matricula: newRepuxadorMatricula || undefined,
      turnoPadrao: newRepuxadorTurno,
    });
  };

  const handleSaveCausa = async () => {
    if (!newCausaDescricao) {
      toast.error("A descrição é obrigatória");
      return;
    }
    if (causaModalOrigin === "parada") {
      await createMotivoParadaMutation.mutateAsync({
        descricao: newCausaDescricao,
      });
    } else {
      await createCausaMutation.mutateAsync({
        descricao: newCausaDescricao,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Lançamento de Repuxados</h1>
          <p className="text-muted-foreground mt-1">Insira e gerencie os lotes de repuxo do dia de trabalho</p>
        </div>
        <div className="flex items-center gap-2 bg-background border rounded-lg p-2 shadow-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input 
            type="date" 
            value={dataProducao} 
            onChange={(e) => setDataProducao(e.target.value)}
            className="border-0 shadow-none h-8 w-40 focus-visible:ring-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Cards de Métricas do Dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border border-border/60 hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KG Bons</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">
                {statsQuery.isLoading ? "..." : `${((statsQuery.data?.totalKgProduzido ?? 0) - (statsQuery.data?.totalKgQuebrado ?? 0)).toFixed(1)} kg`}
              </h3>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
              <Scale size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60 hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Peças Produzidas</p>
              <h3 className="text-2xl font-bold mt-1">
                {statsQuery.isLoading ? "..." : (statsQuery.data?.totalPecasProduzidas ?? 0)}
              </h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60 hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quebras (%)</p>
              <h3 className="text-2xl font-bold mt-1 text-red-500">
                {statsQuery.isLoading ? "..." : `${statsQuery.data?.pctQuebraMedia ?? 0}%`}
              </h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <Percent size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60 hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paradas (Min)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-500">
                {statsQuery.isLoading ? "..." : `${statsQuery.data?.totalTempoParadasMinutos ?? 0}m`}
              </h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Lançamento */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  {editingId ? "Editar Lançamento" : "Registrar Lote de Produção"}
                </div>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    onClick={() => {
                      setEditingId(null);
                      setProductId("");
                      setPecasProduzidas("");
                      setPecasQuebradas("0");
                      setCausaQuebraId("");
                      setObs("");
                      setParadas([]);
                      setProductSearch("");
                      toast.info("Edição cancelada. Formulário limpo.");
                    }}
                  >
                    Cancelar Edição
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSalvarLancamento} className="space-y-4">
                {/* Produto */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-1">
                    <Label className="text-base font-semibold">Produto Repuxado *</Label>
                    {!productId && (
                      <>
                        <div className="hidden md:flex items-center gap-1.5">
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
                                className={cn(
                                  isActive ? config.activeClasses : undefined
                                )}
                                size="icon"
                                title={config.label}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDatePicker(true)}
                            size="icon"
                            title="Escolher data de lançamento"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="md:hidden space-y-2 w-full">
                          <Accordion
                            type="single"
                            collapsible
                            value={mobileModeAccordionOpen ? "mode-selector" : ""}
                            onValueChange={(value) => setMobileModeAccordionOpen(value === "mode-selector")}
                            className="border rounded-lg"
                          >
                            <AccordionItem value="mode-selector" className="border-b-0">
                              <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                                <div className="flex w-full items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm font-medium">
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
                                        className={cn(
                                          "justify-start text-xs",
                                          isActive && config.activeClasses
                                        )}
                                        onClick={() => {
                                          activateMode(mode);
                                          setMobileModeAccordionOpen(false);
                                        }}
                                      >
                                        <Icon className="mr-2 h-3.5 w-3.5" />
                                        {config.label}
                                      </Button>
                                    );
                                  })}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setShowDatePicker(true);
                                      setMobileModeAccordionOpen(false);
                                    }}
                                    className="justify-start text-xs"
                                  >
                                    <Calendar className="mr-2 h-3.5 w-3.5" />
                                    Escolher data
                                  </Button>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                          {renderModeStatusBadge("w-full justify-center")}
                        </div>
                      </>
                    )}
                  </div>

                  {!productId ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          id="search"
                          ref={searchInputRef}
                          type="text"
                          placeholder={searchPlaceholder}
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          onFocus={() => {
                            if (activeSearchMode !== "reader" && activeSearchMode !== "camera") {
                              setIsProductSearchFocused(true);
                            }
                          }}
                          onBlur={() => setTimeout(() => setIsProductSearchFocused(false), 200)}
                          className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        {/* Autocomplete Local (Padrão) */}
                        {(!activeSearchMode || activeSearchMode !== "partial") && isProductSearchFocused && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground text-center">Nenhum produto encontrado</div>
                            ) : (
                              filteredProducts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setProductId(p.id);
                                    setProductSearch("");
                                    void playBeep();
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 focus:bg-indigo-50 flex flex-col border-b border-slate-50 last:border-b-0"
                                >
                                  <span className="font-bold text-indigo-700">{p.code}</span>
                                  <span className="text-slate-600 truncate">{p.description}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resultados da busca parcial trpc */}
                      {activeSearchMode === "partial" && productSearch.length >= 2 && (
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-80 overflow-y-auto space-y-2">
                          {searchResults.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Nenhum produto encontrado</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {searchResults.map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => {
                                    setProductId(product.id);
                                    setProductSearch("");
                                    void playBeep();
                                  }}
                                  className="p-2.5 border rounded-lg bg-white hover:bg-accent hover:border-indigo-500 transition-colors text-left flex gap-3 items-center"
                                >
                                  {product.photoUrl && (
                                    <img
                                      src={product.photoUrl}
                                      alt={product.code}
                                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-indigo-700 text-xs">{product.code}</p>
                                    <p className="text-[11px] text-slate-600 truncate">{product.description}</p>
                                    {product.barcode && <p className="text-[10px] text-muted-foreground">EAN: {product.barcode}</p>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    selectedProduct && (
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-50/30 border border-indigo-100 p-3 rounded-lg flex items-center justify-between shadow-sm animate-fadeIn">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                              {selectedProduct.code}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate block">
                              {selectedProduct.description}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-indigo-100/50 text-[11px] text-slate-600">
                            <div>
                              <strong>Peso:</strong> <span className="text-indigo-600 font-medium">{selectedProduct.pesoUnitarioG ? `${(Number(selectedProduct.pesoUnitarioG) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} kg` : "Não cad."}</span>
                            </div>
                            <div>
                              <strong>Ideal P/H:</strong> <span className="text-indigo-600 font-medium">{selectedProduct.idealPecasHora ? `${selectedProduct.idealPecasHora} p/h` : "Sem meta"}</span>
                            </div>
                            <div>
                              <strong>Meta Quebra:</strong> <span className="text-indigo-600 font-medium">{selectedProduct.metaQuebraPct ? `${selectedProduct.metaQuebraPct}%` : "Sem meta"}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setProductId("")}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100/50 shrink-0"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    )
                  )}
                </div>

                {/* Turno e Operador (Lado a Lado na mesma linha, Turno Primeiro) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <span>Turno *</span>
                      <HelpTooltip content="Turno de trabalho operacional no qual a produção deste lote foi realizada." />
                    </Label>
                    <Select value={turno} onValueChange={setTurno}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Turno A">Turno A</SelectItem>
                        <SelectItem value="Turno B">Turno B</SelectItem>
                        <SelectItem value="Turno C">Turno C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex justify-between items-center">
                      <span className="flex items-center">
                        Operador *
                        <HelpTooltip content="Operador responsável pelo comando da máquina de repuxo durante a fabricação deste lote." />
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowRepuxadorModal(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                      >
                        <UserPlus size={12} /> Novo
                      </button>
                    </Label>
                    <Select value={repuxadorId} onValueChange={setRepuxadorId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {repuxadoresQuery.data?.filter(r => r.ativo).map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seção de Horários (Com Relógios Analógicos SVG ou Digitação Manual) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Horários de Operação *</span>
                    <button
                      type="button"
                      onClick={() => setShowManualTime(!showManualTime)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                    >
                      {showManualTime ? (
                        <>
                          <Clock size={12} /> Mostrar Relógio
                        </>
                      ) : (
                        <>
                          <Keyboard size={12} /> Digitar Manualmente
                        </>
                      )}
                    </button>
                  </div>

                  {!showManualTime ? (
                    <div className="flex flex-col items-center space-y-4">
                      {/* Dois Relógios lado a lado */}
                      <div className="flex justify-center gap-4 w-full">
                        <RetroDigitalClock
                          value={horaInicio}
                          onChange={setHoraInicio}
                          label="Início"
                        />
                        <RetroDigitalClock
                          value={horaFim}
                          onChange={setHoraFim}
                          label="Fim"
                        />
                      </div>

                      {/* Atalhos de Turno */}
                      <div className="flex flex-col gap-1.5 w-full bg-slate-50 p-2.5 rounded-lg border">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">Atalhos rápidos de horários</span>
                        <div className="flex justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHoraInicio("07:40");
                              setHoraFim("12:00");
                            }}
                            className="text-[10px] bg-white hover:bg-slate-50 text-indigo-700 py-1.5 px-2 rounded border border-slate-200 font-semibold flex-1 text-center shadow-xs"
                          >
                            (MC) Manhã: 07:40 - 12:00
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHoraInicio("13:00");
                              setHoraFim("17:30");
                            }}
                            className="text-[10px] bg-white hover:bg-slate-50 text-indigo-700 py-1.5 px-2 rounded border border-slate-200 font-semibold flex-1 text-center shadow-xs"
                          >
                            (TC) Tarde: 13:00 - 17:30
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Digitação Manual */
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center">
                          <span>Hora Início *</span>
                          <HelpTooltip content="Horário inicial em que o operador começou a repuxar este lote de peças." />
                        </Label>
                        <Input 
                          type="time" 
                          value={horaInicio} 
                          onChange={(e) => setHoraInicio(e.target.value)} 
                          className="w-full text-center text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center">
                          <span>Hora Fim *</span>
                          <HelpTooltip content="Horário de encerramento da produção deste lote." />
                        </Label>
                        <Input 
                          type="time" 
                          value={horaFim} 
                          onChange={(e) => setHoraFim(e.target.value)} 
                          className="w-full text-center text-sm font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Produção e Quebra */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <span>Peças Produzidas *</span>
                      <HelpTooltip content="Quantidade total de peças físicas processadas/repuxadas no lote (incluindo as quebras e perdas)." />
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="ex: 350" 
                      value={pecasProduzidas} 
                      onChange={(e) => setPecasProduzidas(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <span>Peças Quebradas</span>
                      <HelpTooltip content="Quantidade de peças que apresentaram defeitos, racharam ou quebraram durante o processo de repuxo." />
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={pecasQuebradas} 
                      onChange={(e) => setPecasQuebradas(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Seção Causa de Quebra (Condicional) */}
                {Number(pecasQuebradas) > 0 && (
                  <div className="space-y-2 border border-red-100 bg-red-50/20 p-3 rounded-md">
                    <Label className="flex justify-between items-center text-red-700">
                      <span className="flex items-center">
                        Causa da Quebra *
                        <HelpTooltip content="Selecione o motivo principal do desperdício para fins de análise no gráfico de Pareto." />
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowCausaModal(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-normal"
                      >
                        <Plus size={10} /> Criar Nova
                      </button>
                    </Label>
                    <Select value={causaQuebraId} onValueChange={setCausaQuebraId}>
                      <SelectTrigger className="border-red-200">
                        <SelectValue placeholder="Selecione o motivo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {causasQuery.data?.filter(c => c.ativo).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Paradas de Máquina (Acordion/Seção) */}
                <div className="border rounded-md p-3 space-y-2 bg-slate-50/30">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    <span className="flex items-center">
                      Paradas de Máquina
                      <HelpTooltip content="Registre os minutos e motivos das paradas de máquina ocorridas durante o lote. Essas paradas impactam o cálculo de Disponibilidade no OEE." />
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">{tempoParadasTotal} min no total</span>
                  </div>

                  {/* Lista de paradas atuais */}
                  {paradas.length > 0 && (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2">
                      {paradas.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white border border-border/80 px-2 py-1 rounded text-xs">
                          <span className="font-semibold text-amber-600">{p.tempoMinutos} min</span>
                          <span className="text-muted-foreground truncate max-w-[150px]">{p.motivo}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveParada(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Parada inline com Causa/Motivo Selecionável e Modal de Cadastro */}
                  <div className="flex gap-2 items-end">
                    <div className="w-20 shrink-0">
                      <Label className="text-[10px] text-muted-foreground text-center block">Minutos</Label>
                      <Input 
                        type="number" 
                        placeholder="min" 
                        value={tempParadaMin}
                        onChange={(e) => setTempParadaMin(e.target.value)}
                        className="h-8 text-xs px-1 text-center font-semibold"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Label className="text-[10px] text-muted-foreground flex justify-between items-center mb-1">
                        <span>Causa/Motivo *</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCausaModalOrigin("parada");
                            setShowCausaModal(true);
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                        >
                          <Plus size={10} /> Novo
                        </button>
                      </Label>
                      
                      <Select value={tempParadaCausaId} onValueChange={setTempParadaCausaId}>
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {motivosParadaQuery.data?.filter(m => m.ativo).map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.descricao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-16 shrink-0">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleAddParada}
                        className="h-8 w-full text-xs px-1 font-semibold"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Obs */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    placeholder="Adicione observações se necessário" 
                    value={obs} 
                    onChange={(e) => setObs(e.target.value)} 
                    rows={2}
                  />
                </div>

                {/* Painel de Cálculo inline (Micro-Interações) */}
                {selectedProduct && pecasProduzidas && (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-md space-y-2 animate-fadeIn">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">Resumo Estimado Lote</div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                      <div>KG Bons: <strong>{(calcKgTotal - calcKgQuebra).toFixed(2)} kg</strong></div>
                      <div>KG Quebrado: <strong>{calcKgQuebra.toFixed(2)} kg</strong></div>
                      <div>Quebra: <strong className={alertaQuebra ? "text-red-600" : "text-emerald-600"}>{calcPctQuebra.toFixed(2)}%</strong></div>
                      {calcEficiencia !== null && (
                        <div>Eficiência: <strong className={alertaEficiencia ? "text-amber-600" : "text-emerald-600"}>{calcEficiencia.toFixed(0)}%</strong></div>
                      )}
                    </div>
                    {alertaQuebra && (
                      <div className="text-xs text-red-600 flex items-center gap-1 font-semibold pt-1 border-t border-indigo-100">
                        <AlertTriangle size={12} /> {alertaQuebra}
                      </div>
                    )}
                    {alertaEficiencia && (
                      <div className="text-xs text-amber-600 flex items-center gap-1 font-semibold">
                        <AlertTriangle size={12} /> {alertaEficiencia}
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className={cn(
                    "w-full font-semibold transition-all",
                    editingId 
                      ? "bg-amber-600 hover:bg-amber-700 text-white" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}
                  disabled={createLancamento.isPending || updateLancamento.isPending}
                >
                  {editingId 
                    ? (updateLancamento.isPending ? "Atualizando..." : "Atualizar Lançamento") 
                    : (createLancamento.isPending ? "Salvando..." : "Salvar Lançamento")
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Lançamentos do Dia */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                Lançamentos do Dia ({format(selectedDateObject, "dd/MM/yyyy")})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lancamentosQuery.isLoading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Carregando lançamentos...</div>
              ) : !lancamentosQuery.data || lancamentosQuery.data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum lote lançado nesta data</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/50">
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("repuxadorNome")}
                        >
                          <div className="flex items-center gap-1">
                            Operador / Turno
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "repuxadorNome" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("productCode")}
                        >
                          <div className="flex items-center gap-1">
                            Produto
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "productCode" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none"
                          onClick={() => handleSort("horaInicio")}
                        >
                          <div className="flex items-center gap-1">
                            Horário
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "horaInicio" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none text-right"
                          onClick={() => handleSort("pesoKg")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Produzidas (kg)
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "pesoKg" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none text-right"
                          onClick={() => handleSort("pecasQuebradasPct")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Quebras (%)
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "pecasQuebradasPct" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-200/50 transition-colors select-none text-center"
                          onClick={() => handleSort("tempoParadas")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Paradas
                            <ArrowUpDown size={12} className={cn("text-muted-foreground/60", sortField === "tempoParadas" && "text-indigo-600 font-bold")} />
                          </div>
                        </TableHead>
                        <TableHead className="w-20 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedLancamentos.map((l) => {
                        const peso = Number(l.pesoUnitarioG || 0);
                        const kgProd = (l.pecasProduzidas * peso) / 1000;
                        const kgQueb = (l.pecasQuebradas * peso) / 1000;
                        const pctQ = l.pecasProduzidas > 0 ? (l.pecasQuebradas / l.pecasProduzidas) * 100 : 0;
                        const minInicio = timeToMinutes(l.horaInicio);
                        const minFim = timeToMinutes(l.horaFim);
                        let duracaoMin = minFim - minInicio;
                        if (duracaoMin < 0) duracaoMin += 24 * 60;
                        const tempoParadas = l.paradas.reduce((acc: number, cur: any) => acc + cur.tempoMinutos, 0);

                        return (
                          <TableRow key={l.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    className="h-2.5 w-2.5 rounded-full border border-slate-200 shrink-0" 
                                    style={{ backgroundColor: l.repuxadorCor || "#6366f1" }} 
                                  />
                                  <span className="font-semibold text-sm text-slate-800">{l.repuxadorNome}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pl-4">
                                  <Badge 
                                    variant="outline" 
                                    style={{ 
                                      borderColor: l.turnoCor || "#64748b", 
                                      color: l.turnoCor || "#64748b" 
                                    }}
                                    className="text-[9px] font-bold px-1.5 py-0 bg-white"
                                  >
                                    {l.turno}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-semibold text-sm">{l.productCode}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{l.productDescription}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{l.horaInicio} às {l.horaFim}</div>
                              <div className="text-xs text-muted-foreground">({duracaoMin} min)</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-semibold">{l.pecasProduzidas} pçs</div>
                              <div className="text-xs text-muted-foreground">({kgProd.toFixed(1)} kg)</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={pctQ > Number(l.metaQuebraPct || 0) ? "font-bold text-red-500" : "font-semibold"}>
                                {pctQ.toFixed(1)}%
                              </div>
                              {l.causaDescricao && (
                                <div className="text-[10px] text-red-400 font-semibold">{l.causaDescricao}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {tempoParadas > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                    {tempoParadas}m
                                  </span>
                                  {l.paradas && l.paradas.length > 0 && (
                                    <div className="text-[10px] text-amber-600 font-semibold uppercase max-w-[120px] truncate" title={l.paradas.map((p: any) => p.causaDescricao || p.motivo).filter(Boolean).join(", ")}>
                                      {l.paradas.map((p: any) => p.causaDescricao || p.motivo).filter(Boolean).join(", ")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                  onClick={() => handleEditarClick(l)}
                                  title="Editar lançamento"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeletarLancamento(l.id)}
                                  title="Excluir lançamento"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
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
        </div>
      </div>

      {/* Modal Novo Repuxador */}
      <Dialog open={showRepuxadorModal} onOpenChange={setShowRepuxadorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Operador / Repuxador</DialogTitle>
            <DialogDescription>Cadastre um novo operador no banco de dados para poder lançar produções dele</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input 
                value={newRepuxadorNome} 
                onChange={(e) => setNewRepuxadorNome(e.target.value)} 
                placeholder="ex: João Silva" 
              />
            </div>
            <div className="space-y-2">
              <Label>Matrícula / Código</Label>
              <Input 
                value={newRepuxadorMatricula} 
                onChange={(e) => setNewRepuxadorMatricula(e.target.value)} 
                placeholder="ex: RE-123" 
              />
            </div>
            <div className="space-y-2">
              <Label>Turno Padrão</Label>
              <Select value={newRepuxadorTurno} onValueChange={setNewRepuxadorTurno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Turno A">Turno A</SelectItem>
                  <SelectItem value="Turno B">Turno B</SelectItem>
                  <SelectItem value="Turno C">Turno C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepuxadorModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveRepuxador} disabled={createRepuxadorMutation.isPending}>
              {createRepuxadorMutation.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Causa / Motivo */}
      <Dialog open={showCausaModal} onOpenChange={setShowCausaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {causaModalOrigin === "parada" ? "Cadastrar Motivo de Parada" : "Cadastrar Motivo de Quebra"}
            </DialogTitle>
            <DialogDescription>
              {causaModalOrigin === "parada" 
                ? "Adicione um motivo padronizado de parada de máquina" 
                : "Adicione um motivo padronizado de desperdício ou quebra"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {causaModalOrigin === "parada" ? "Descrição do Motivo *" : "Descrição da Causa *"}
              </Label>
              <Input 
                value={newCausaDescricao} 
                onChange={(e) => setNewCausaDescricao(e.target.value)} 
                placeholder={causaModalOrigin === "parada" ? "ex: Manutenção corretiva" : "ex: Rebarba de material irregular"} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCausaModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveCausa} 
              disabled={createCausaMutation.isPending || createMotivoParadaMutation.isPending}
            >
              {createCausaMutation.isPending || createMotivoParadaMutation.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Picker Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="w-full max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Escolher Data de Lançamento</DialogTitle>
            <DialogDescription>
              Selecione a data em que deseja lançar a produção.
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
            const fallbackMode = lastNonCameraModeRef.current ?? "reader";
            setActiveSearchMode(fallbackMode);
            if (fallbackMode === "reader") {
              searchInputRef.current?.blur();
            }
          }
          focusSearchInput();
        }}
        onDetected={handleCameraDetected}
      />

      {activeSearchMode === "camera" && (
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
    </div>
  );
}
