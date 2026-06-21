import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Scale, 
  UserPlus, 
  FileText,
  HelpCircle,
  TrendingDown,
  Percent,
  X,
  Keyboard
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function AnalogClock({
  value,
  onChange,
  mode,
  setMode,
}: {
  value: string;
  onChange: (val: string) => void;
  mode: "hour" | "minute";
  setMode: (mode: "hour" | "minute") => void;
}) {
  const [h, m] = value.split(":").map(Number);
  const isPm = h >= 12;
  const displayHour = h % 12 === 0 ? 12 : h % 12;

  const handlePeriodChange = (pm: boolean) => {
    let newH = h % 12;
    if (pm) {
      newH += 12;
    }
    onChange(`${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const handleHourSelect = (hour12: number) => {
    let newH = hour12 % 12;
    if (isPm) newH += 12;
    onChange(`${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setMode("minute");
  };

  const handleMinuteSelect = (minVal: number) => {
    onChange(`${String(h).padStart(2, "0")}:${String(minVal).padStart(2, "0")}`);
    setMode("hour");
  };

  const angle = mode === "hour" ? displayHour * 30 : m * 6;
  const rad = (angle * Math.PI) / 180;
  const pointerX = 65 + 42 * Math.sin(rad);
  const pointerY = 65 - 42 * Math.cos(rad);

  const hoursArray = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-xs w-[165px] shrink-0">
      <div className="flex items-center justify-between w-full mb-1">
        <button
          type="button"
          onClick={() => setMode("hour")}
          className={`text-xs font-bold px-1 py-0.5 rounded transition-colors ${mode === "hour" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
        >
          {String(h).padStart(2, "0")}h
        </button>
        <span className="text-slate-300">:</span>
        <button
          type="button"
          onClick={() => setMode("minute")}
          className={`text-xs font-bold px-1 py-0.5 rounded transition-colors ${mode === "minute" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
        >
          {String(m).padStart(2, "0")}m
        </button>

        <div className="flex bg-slate-100 border rounded p-0.5 text-[8px] font-bold">
          <button
            type="button"
            onClick={() => handlePeriodChange(false)}
            className={`px-1 py-0.5 rounded-sm ${!isPm ? "bg-white shadow-xs text-indigo-700 font-bold" : "text-slate-400"}`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange(true)}
            className={`px-1 py-0.5 rounded-sm ${isPm ? "bg-white shadow-xs text-indigo-700 font-bold" : "text-slate-400"}`}
          >
            PM
          </button>
        </div>
      </div>

      <div className="relative w-[130px] h-[130px] bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center">
        <svg width="130" height="130" className="select-none">
          <circle cx="65" cy="65" r="3" fill="#4f46e5" />
          
          <line
            x1="65"
            y1="65"
            x2={pointerX}
            y2={pointerY}
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={pointerX} cy={pointerY} r="3.5" fill="#4f46e5" />

          {mode === "hour" ? (
            hoursArray.map((val) => {
              const theta = (val * 30 * Math.PI) / 180;
              const x = 65 + 46 * Math.sin(theta);
              const y = 65 - 46 * Math.cos(theta);
              const isSelected = displayHour === val;
              return (
                <g key={val} className="cursor-pointer" onClick={() => handleHourSelect(val)}>
                  <circle cx={x} cy={y - 1} r="7" fill={isSelected ? "#4f46e5" : "transparent"} className="hover:fill-slate-200/50" />
                  <text
                    x={x}
                    y={y + 2}
                    textAnchor="middle"
                    className={`text-[8px] font-bold ${isSelected ? "fill-white" : "fill-slate-500 hover:fill-indigo-600"}`}
                  >
                    {val}
                  </text>
                </g>
              );
            })
          ) : (
            minutesArray.map((val) => {
              const theta = (val * 6 * Math.PI) / 180;
              const x = 65 + 46 * Math.sin(theta);
              const y = 65 - 46 * Math.cos(theta);
              const isSelected = m === val;
              return (
                <g key={val} className="cursor-pointer" onClick={() => handleMinuteSelect(val)}>
                  <circle cx={x} cy={y - 1} r="7" fill={isSelected ? "#4f46e5" : "transparent"} className="hover:fill-slate-200/50" />
                  <text
                    x={x}
                    y={y + 2}
                    textAnchor="middle"
                    className={`text-[8px] font-bold ${isSelected ? "fill-white" : "fill-slate-500 hover:fill-indigo-600"}`}
                  >
                    {val}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}

interface ParadaInput {
  tempoMinutos: number;
  motivo: string;
  causaQuebraId?: number;
}

export default function LancamentoRepuxados() {
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

  // States extras para o controle de relógio móvel
  const [showManualTime, setShowManualTime] = useState(false);
  const [clockStartMode, setClockStartMode] = useState<"hour" | "minute">("hour");
  const [clockEndMode, setClockEndMode] = useState<"hour" | "minute">("hour");
  const [isCustomParadaMotivo, setIsCustomParadaMotivo] = useState(false);
  
  // Paradas associadas
  const [paradas, setParadas] = useState<ParadaInput[]>([]);
  const [tempParadaMin, setTempParadaMin] = useState("");
  const [tempParadaMotivo, setTempParadaMotivo] = useState("");
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

    let finalMotivo = tempParadaMotivo;
    let finalCausaId: number | undefined = undefined;

    if (!isCustomParadaMotivo) {
      if (!tempParadaCausaId) {
        toast.warning("Selecione uma causa da lista ou clique em Novo para digitar");
        return;
      }
      finalCausaId = Number(tempParadaCausaId);
      const causaObj = causasQuery.data?.find(c => c.id === finalCausaId);
      finalMotivo = causaObj ? causaObj.descricao : "Parada formal registrada";
    } else {
      if (!tempParadaMotivo.trim()) {
        toast.warning("Digite o motivo da parada");
        return;
      }
      finalMotivo = tempParadaMotivo.trim();
    }

    setParadas([...paradas, {
      tempoMinutos: tempo,
      motivo: finalMotivo,
      causaQuebraId: finalCausaId
    }]);

    setTempParadaMin("");
    setTempParadaMotivo("");
    setTempParadaCausaId("");
    setIsCustomParadaMotivo(false);
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

    await createLancamento.mutateAsync({
      productId,
      repuxadorId: Number(repuxadorId),
      dataProducao: selectedDateObject,
      turno,
      horaInicio,
      horaFim,
      pecasProduzidas: totalP,
      pecasQuebradas: quebradas,
      causaQuebraId: causaQuebraId ? Number(causaQuebraId) : undefined,
      obs,
      paradas: paradas.map(p => ({
        tempoMinutos: p.tempoMinutos,
        motivo: p.motivo,
        causaQuebraId: p.causaQuebraId
      }))
    });
  };

  const handleDeletarLancamento = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento de produção?")) {
      await deleteLancamento.mutateAsync({ id });
    }
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
    await createCausaMutation.mutateAsync({
      descricao: newCausaDescricao,
    });
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
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Registrar Lote de Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSalvarLancamento} className="space-y-4">
                {/* Turno e Operador (Lado a Lado na mesma linha, Turno Primeiro) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Turno *</Label>
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
                      <span>Operador *</span>
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

                {/* Produto */}
                <div className="space-y-2">
                  <Label>Produto Repuxado *</Label>
                  {!productId ? (
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Buscar código ou descrição..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onFocus={() => setIsProductSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsProductSearchFocused(false), 200)}
                        className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      {isProductSearchFocused && (
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
                        <div className="space-y-1 flex flex-col items-center">
                          <span className="text-[11px] font-semibold text-slate-500">Início: {horaInicio}</span>
                          <AnalogClock
                            value={horaInicio}
                            onChange={setHoraInicio}
                            mode={clockStartMode}
                            setMode={setClockStartMode}
                          />
                        </div>
                        <div className="space-y-1 flex flex-col items-center">
                          <span className="text-[11px] font-semibold text-slate-500">Fim: {horaFim}</span>
                          <AnalogClock
                            value={horaFim}
                            onChange={setHoraFim}
                            mode={clockEndMode}
                            setMode={setClockEndMode}
                          />
                        </div>
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
                        <Label>Hora Início *</Label>
                        <Input 
                          type="time" 
                          value={horaInicio} 
                          onChange={(e) => setHoraInicio(e.target.value)} 
                          className="w-full text-center text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora Fim *</Label>
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
                    <Label>Peças Produzidas *</Label>
                    <Input 
                      type="number" 
                      placeholder="ex: 350" 
                      value={pecasProduzidas} 
                      onChange={(e) => setPecasProduzidas(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peças Quebradas</Label>
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
                      <span>Causa da Quebra *</span>
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
                    <span>Paradas de Máquina</span>
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

                  {/* Add Parada inline com Autocomplete/Sugestões e Causa/Motivo Unificado */}
                  <div className="grid grid-cols-12 gap-1.5 items-end">
                    <div className="col-span-3">
                      <Label className="text-[10px] text-muted-foreground text-center block">Minutos</Label>
                      <Input 
                        type="number" 
                        placeholder="min" 
                        value={tempParadaMin}
                        onChange={(e) => setTempParadaMin(e.target.value)}
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                    
                    <div className="col-span-7">
                      <Label className="text-[10px] text-muted-foreground flex justify-between items-center">
                        <span>Causa/Motivo *</span>
                        {isCustomParadaMotivo ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomParadaMotivo(false);
                              setTempParadaCausaId("");
                              setTempParadaMotivo("");
                            }}
                            className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                          >
                            Selecionar da lista
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomParadaMotivo(true);
                              setTempParadaCausaId("");
                              setTempParadaMotivo("");
                            }}
                            className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                          >
                            <Plus size={10} /> Novo (Digitar)
                          </button>
                        )}
                      </Label>
                      
                      {isCustomParadaMotivo ? (
                        <Input 
                          type="text" 
                          placeholder="Digite o motivo da parada..." 
                          value={tempParadaMotivo}
                          onChange={(e) => setTempParadaMotivo(e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                      ) : (
                        <Select value={tempParadaCausaId} onValueChange={setTempParadaCausaId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {causasQuery.data?.filter(c => c.ativo).map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.descricao}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleAddParada}
                        className="h-8 w-full text-xs px-1"
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* Histórico/Motivos frequentes (exibir apenas no modo digitação manual para autocomplete!) */}
                    {isCustomParadaMotivo && motivosFrequentesQuery.data && motivosFrequentesQuery.data.length > 0 && (
                      <div className="col-span-12 mt-1.5">
                        <span className="text-[9px] text-muted-foreground block mb-1 font-semibold">Motivos frequentes (Toque para preencher):</span>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pb-0.5">
                          {motivosFrequentesQuery.data.map((motivoStr, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setTempParadaMotivo(motivoStr)}
                              className="text-[9px] bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/60 transition-colors shrink-0 font-medium"
                            >
                              {motivoStr}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700" 
                  disabled={createLancamento.isPending}
                >
                  {createLancamento.isPending ? "Salvando..." : "Salvar Lançamento"}
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
                        <TableHead>Operador / Turno</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead className="text-right">Produzidas (kg)</TableHead>
                        <TableHead className="text-right">Quebras (%)</TableHead>
                        <TableHead className="text-center">Paradas</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosQuery.data.map((l) => {
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
                              <div className="font-semibold text-sm">{l.repuxadorNome}</div>
                              <div className="text-xs text-muted-foreground">{l.turno}</div>
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
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  {tempoParadas}m
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeletarLancamento(l.id)}
                              >
                                <Trash2 size={16} />
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

      {/* Modal Nova Causa */}
      <Dialog open={showCausaModal} onOpenChange={setShowCausaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Motivo de Quebra</DialogTitle>
            <DialogDescription>Adicione um motivo padronizado de desperdício ou quebra</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição da Causa *</Label>
              <Input 
                value={newCausaDescricao} 
                onChange={(e) => setNewCausaDescricao(e.target.value)} 
                placeholder="ex: Rebarba de material irregular" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCausaModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCausa} disabled={createCausaMutation.isPending}>
              {createCausaMutation.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
