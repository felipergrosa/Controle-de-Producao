import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Ban, 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  ToggleLeft, 
  ToggleRight,
  Calendar,
  Zap
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Cores curadas para a paleta premium
const PALETA_CORES = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Rose" },
  { hex: "#64748b", label: "Slate" }
];

export default function GerenciadorCadastros() {
  const [activeTab, setActiveTab] = useState("operadores");
  const utils = trpc.useUtils();

  // ==========================================
  // ESTADOS - OPERADORES (REPUXADORES)
  // ==========================================
  const [opId, setOpId] = useState<number | null>(null);
  const [opNome, setOpNome] = useState("");
  const [opCodigo, setOpCodigo] = useState("");
  const [opMatricula, setOpMatricula] = useState("");
  const [opTurnoPadrao, setOpTurnoPadrao] = useState("Turno A");
  const [opCor, setOpCor] = useState("#6366f1");

  // ==========================================
  // ESTADOS - TURNOS
  // ==========================================
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [turnoCodigo, setTurnoCodigo] = useState("");
  const [turnoDescricao, setTurnoDescricao] = useState("");
  const [turnoCor, setTurnoCor] = useState("#6366f1");

  // ==========================================
  // ESTADOS - CAUSAS DE QUEBRA
  // ==========================================
  const [causaId, setCausaId] = useState<number | null>(null);
  const [causaCodigo, setCausaCodigo] = useState("");
  const [causaDescricao, setCausaDescricao] = useState("");
  const [causaCor, setCausaCor] = useState("#ef4444");

  // ==========================================
  // ESTADOS - MOTIVOS DE PARADA
  // ==========================================
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [motivoCodigo, setMotivoCodigo] = useState("");
  const [motivoDescricao, setMotivoDescricao] = useState("");
  const [motivoCor, setMotivoCor] = useState("#f59e0b");

  // ==========================================
  // ESTADOS - JORNADA
  // ==========================================
  const [politicaEdit, setPoliticaEdit] = useState<any>(null);

  // ==========================================
  // QUERIES DO TRPC
  // ==========================================
  const repuxadoresQuery = trpc.repuxadores.list.useQuery();
  const turnosQuery = trpc.turnos.list.useQuery();
  const causasQuery = trpc.causasQuebra.list.useQuery();
  const motivosParadaQuery = trpc.motivosParada.list.useQuery();
  const politicasQuery = trpc.politicaJornada.list.useQuery();

  // ==========================================
  // MUTATIONS DO TRPC
  // ==========================================
  // Operadores
  const createOp = trpc.repuxadores.create.useMutation({
    onSuccess: () => {
      toast.success("Operador cadastrado com sucesso!");
      resetOpForm();
      utils.repuxadores.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao cadastrar operador")
  });

  const updateOp = trpc.repuxadores.update.useMutation({
    onSuccess: () => {
      toast.success("Operador atualizado com sucesso!");
      resetOpForm();
      utils.repuxadores.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar operador")
  });

  const deleteOp = trpc.repuxadores.delete.useMutation({
    onSuccess: () => {
      toast.success("Status do operador alterado!");
      utils.repuxadores.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao alterar status do operador")
  });

  // Turnos
  const createTurno = trpc.turnos.create.useMutation({
    onSuccess: () => {
      toast.success("Turno cadastrado com sucesso!");
      resetTurnoForm();
      utils.turnos.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao cadastrar turno")
  });

  const updateTurno = trpc.turnos.update.useMutation({
    onSuccess: () => {
      toast.success("Turno atualizado com sucesso!");
      resetTurnoForm();
      utils.turnos.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar turno")
  });

  const deleteTurno = trpc.turnos.delete.useMutation({
    onSuccess: () => {
      toast.success("Status do turno alterado!");
      utils.turnos.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao inativar turno")
  });

  // Causas de Quebra
  const createCausa = trpc.causasQuebra.create.useMutation({
    onSuccess: () => {
      toast.success("Causa de quebra cadastrada!");
      resetCausaForm();
      utils.causasQuebra.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao cadastrar causa")
  });

  const updateCausa = trpc.causasQuebra.update.useMutation({
    onSuccess: () => {
      toast.success("Causa de quebra atualizada!");
      resetCausaForm();
      utils.causasQuebra.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar causa")
  });

  const deleteCausa = trpc.causasQuebra.delete.useMutation({
    onSuccess: () => {
      toast.success("Status da causa alterado!");
      utils.causasQuebra.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao inativar causa")
  });

  // Motivos de Parada
  const createMotivo = trpc.motivosParada.create.useMutation({
    onSuccess: () => {
      toast.success("Motivo de parada cadastrado!");
      resetMotivoForm();
      utils.motivosParada.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao cadastrar motivo de parada")
  });

  const updateMotivo = trpc.motivosParada.update.useMutation({
    onSuccess: () => {
      toast.success("Motivo de parada atualizado!");
      resetMotivoForm();
      utils.motivosParada.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar motivo de parada")
  });

  const deleteMotivo = trpc.motivosParada.delete.useMutation({
    onSuccess: () => {
      toast.success("Status do motivo de parada alterado!");
      utils.motivosParada.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao inativar motivo")
  });

  // Jornada
  const deleteJornada = trpc.politicaJornada.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Política de jornada inativada!");
      utils.politicaJornada.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao inativar política")
  });

  // ==========================================
  // FUNÇÕES AUXILIARES DE LIMPEZA E EDIT
  // ==========================================
  const resetOpForm = () => {
    setOpId(null);
    setOpNome("");
    setOpCodigo("");
    setOpMatricula("");
    setOpTurnoPadrao("Turno A");
    setOpCor("#6366f1");
  };

  const handleEditOp = (o: any) => {
    setOpId(o.id);
    setOpNome(o.nome);
    setOpCodigo(o.codigo || "");
    setOpMatricula(o.matricula || "");
    setOpTurnoPadrao(o.turnoPadrao || "Turno A");
    setOpCor(o.cor || "#6366f1");
  };

  const resetTurnoForm = () => {
    setTurnoId(null);
    setTurnoCodigo("");
    setTurnoDescricao("");
    setTurnoCor("#6366f1");
  };

  const handleEditTurno = (t: any) => {
    setTurnoId(t.id);
    setTurnoCodigo(t.codigo || "");
    setTurnoDescricao(t.descricao || "");
    setTurnoCor(t.cor || "#6366f1");
  };

  const resetCausaForm = () => {
    setCausaId(null);
    setCausaCodigo("");
    setCausaDescricao("");
    setCausaCor("#ef4444");
  };

  const handleEditCausa = (c: any) => {
    setCausaId(c.id);
    setCausaCodigo(c.codigo || "");
    setCausaDescricao(c.descricao || "");
    setCausaCor(c.cor || "#ef4444");
  };

  const resetMotivoForm = () => {
    setMotivoId(null);
    setMotivoCodigo("");
    setMotivoDescricao("");
    setMotivoCor("#f59e0b");
  };

  const handleEditMotivo = (m: any) => {
    setMotivoId(m.id);
    setMotivoCodigo(m.codigo || "");
    setMotivoDescricao(m.descricao || "");
    setMotivoCor(m.cor || "#f59e0b");
  };

  // ==========================================
  // ENVIOS DOS FORMULÁRIOS
  // ==========================================
  const handleSaveOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opNome.trim()) {
      toast.error("O nome do operador é obrigatório");
      return;
    }

    if (opId !== null) {
      await updateOp.mutateAsync({
        id: opId,
        nome: opNome,
        codigo: opCodigo,
        matricula: opMatricula,
        turnoPadrao: opTurnoPadrao,
        cor: opCor
      });
    } else {
      await createOp.mutateAsync({
        nome: opNome,
        codigo: opCodigo,
        matricula: opMatricula,
        turnoPadrao: opTurnoPadrao,
        cor: opCor
      });
    }
  };

  const handleSaveTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoCodigo.trim() || !turnoDescricao.trim()) {
      toast.error("Código e Descrição são obrigatórios");
      return;
    }

    if (turnoId !== null) {
      await updateTurno.mutateAsync({
        id: turnoId,
        codigo: turnoCodigo,
        descricao: turnoDescricao,
        cor: turnoCor
      });
    } else {
      await createTurno.mutateAsync({
        codigo: turnoCodigo,
        descricao: turnoDescricao,
        cor: turnoCor
      });
    }
  };

  const handleSaveCausa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!causaDescricao.trim()) {
      toast.error("A descrição da causa é obrigatória");
      return;
    }

    if (causaId !== null) {
      await updateCausa.mutateAsync({
        id: causaId,
        codigo: causaCodigo,
        descricao: causaDescricao,
        cor: causaCor
      });
    } else {
      await createCausa.mutateAsync({
        codigo: causaCodigo,
        descricao: causaDescricao,
        cor: causaCor
      });
    }
  };

  const handleSaveMotivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDescricao.trim()) {
      toast.error("A descrição do motivo é obrigatória");
      return;
    }

    if (motivoId !== null) {
      await updateMotivo.mutateAsync({
        id: motivoId,
        codigo: motivoCodigo,
        descricao: motivoDescricao,
        cor: motivoCor
      });
    } else {
      await createMotivo.mutateAsync({
        codigo: motivoCodigo,
        descricao: motivoDescricao,
        cor: motivoCor
      });
    }
  };

  const toggleAtivoOp = async (o: any) => {
    await updateOp.mutateAsync({
      id: o.id,
      ativo: !o.ativo
    });
  };

  const toggleAtivoTurno = async (t: any) => {
    await updateTurno.mutateAsync({
      id: t.id,
      ativo: !t.ativo
    });
  };

  const toggleAtivoCausa = async (c: any) => {
    await updateCausa.mutateAsync({
      id: c.id,
      ativo: !c.ativo
    });
  };

  const toggleAtivoMotivo = async (m: any) => {
    await updateMotivo.mutateAsync({
      id: m.id,
      ativo: !m.ativo
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
          <Settings className="text-indigo-500" />
          Gerenciador de Cadastros
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure operadores, turnos de trabalho, motivos de parada e causas de quebra de peças do módulo de repuxo
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full md:w-[760px] border bg-slate-50/50 p-1">
          <TabsTrigger value="operadores" className="flex items-center gap-1.5 py-2">
            <Users size={15} /> Operadores
          </TabsTrigger>
          <TabsTrigger value="turnos" className="flex items-center gap-1.5 py-2">
            <Clock size={15} /> Turnos
          </TabsTrigger>
          <TabsTrigger value="causas" className="flex items-center gap-1.5 py-2">
            <AlertTriangle size={15} /> Causas Quebra
          </TabsTrigger>
          <TabsTrigger value="paradas" className="flex items-center gap-1.5 py-2">
            <Ban size={15} /> Motivos Parada
          </TabsTrigger>
          <TabsTrigger value="jornada" className="flex items-center gap-1.5 py-2">
            <Calendar size={15} /> Jornada
          </TabsTrigger>
        </TabsList>

        {/* ========================================================
            TABS CONTENT: OPERADORES
           ======================================================== */}
        <TabsContent value="operadores" className="grid grid-cols-1 lg:grid-cols-12 gap-6 outline-none">
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">
                  {opId !== null ? "Editar Operador" : "Adicionar Operador"}
                </CardTitle>
                <CardDescription>Cadastre as informações básicas do operador de repuxo</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveOp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="opNome">Nome do Operador *</Label>
                    <Input 
                      id="opNome" 
                      placeholder="ex: MATEUS SOUZA" 
                      value={opNome} 
                      onChange={(e) => setOpNome(e.target.value.toUpperCase())} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opCodigo">Código</Label>
                      <Input 
                        id="opCodigo" 
                        placeholder="ex: OP01" 
                        value={opCodigo} 
                        onChange={(e) => setOpCodigo(e.target.value.toUpperCase())} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opMatricula">Matrícula</Label>
                      <Input 
                        id="opMatricula" 
                        placeholder="ex: 1245" 
                        value={opMatricula} 
                        onChange={(e) => setOpMatricula(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opTurno">Turno Padrão</Label>
                    <Select value={opTurnoPadrao} onValueChange={setOpTurnoPadrao}>
                      <SelectTrigger id="opTurno" className="w-full">
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
                    <Label>Cor de Exibição / Badge</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PALETA_CORES.map((cor) => (
                        <button
                          key={cor.hex}
                          type="button"
                          className="h-7 w-7 rounded-full border border-slate-300 relative transition-transform hover:scale-110 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cor.hex }}
                          onClick={() => setOpCor(cor.hex)}
                          title={cor.label}
                        >
                          {opCor === cor.hex && <Check size={12} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        type="color" 
                        value={opCor} 
                        onChange={(e) => setOpCor(e.target.value)} 
                        className="h-8 w-12 p-0.5 border cursor-pointer rounded" 
                      />
                      <span className="text-xs text-muted-foreground font-mono">{opCor}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      disabled={createOp.isPending || updateOp.isPending}
                    >
                      {opId !== null ? "Salvar Alterações" : "Cadastrar Operador"}
                    </Button>
                    {opId !== null && (
                      <Button type="button" variant="outline" onClick={resetOpForm}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">Operadores Cadastrados</CardTitle>
                <CardDescription>Lista completa de operadores de repuxo e seus status</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {repuxadoresQuery.isLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Carregando operadores...</div>
                ) : !repuxadoresQuery.data || repuxadoresQuery.data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Nenhum operador cadastrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100/50">
                        <TableRow>
                          <TableHead className="w-24">Código</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Turno Padrão</TableHead>
                          <TableHead>Cor / Badge</TableHead>
                          <TableHead className="text-center w-24">Status</TableHead>
                          <TableHead className="text-center w-28">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repuxadoresQuery.data.map((o) => (
                          <TableRow key={o.id} className={!o.ativo ? "opacity-60 bg-slate-50/30" : ""}>
                            <TableCell className="font-mono font-semibold">{o.codigo || "-"}</TableCell>
                            <TableCell className="font-medium">{o.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{o.matricula || "-"}</TableCell>
                            <TableCell>{o.turnoPadrao || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: o.cor || "#6366f1" }} />
                                <Badge style={{ backgroundColor: o.cor || "#6366f1", color: "#fff" }}>
                                  {o.nome.split(" ")[0]}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={o.ativo ? "default" : "secondary"} className={o.ativo ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}>
                                {o.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                  onClick={() => handleEditOp(o)}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={o.ativo ? "h-8 w-8 text-amber-500 hover:text-amber-700" : "h-8 w-8 text-emerald-500 hover:text-emerald-700"}
                                  onClick={() => toggleAtivoOp(o)}
                                  title={o.ativo ? "Inativar" : "Ativar"}
                                >
                                  {o.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if(window.confirm("Deseja realmente apagar este registro?")) {
                                      deleteOp.mutate({ id: o.id });
                                    }
                                  }}
                                  title="Apagar"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* ========================================================
            TABS CONTENT: TURNOS
           ======================================================== */}
        <TabsContent value="turnos" className="grid grid-cols-1 lg:grid-cols-12 gap-6 outline-none">
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">
                  {turnoId !== null ? "Editar Turno" : "Adicionar Turno"}
                </CardTitle>
                <CardDescription>Cadastre as informações básicas dos turnos de trabalho</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveTurno} className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-2">
                      <Label htmlFor="turnoCodigo">Código *</Label>
                      <Input 
                        id="turnoCodigo" 
                        placeholder="ex: TA" 
                        value={turnoCodigo} 
                        onChange={(e) => setTurnoCodigo(e.target.value.toUpperCase())} 
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="turnoDescricao">Descrição *</Label>
                      <Input 
                        id="turnoDescricao" 
                        placeholder="ex: TURNO A - DIURNO" 
                        value={turnoDescricao} 
                        onChange={(e) => setTurnoDescricao(e.target.value.toUpperCase())} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Badge do Turno</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PALETA_CORES.map((cor) => (
                        <button
                          key={cor.hex}
                          type="button"
                          className="h-7 w-7 rounded-full border border-slate-300 relative transition-transform hover:scale-110 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cor.hex }}
                          onClick={() => setTurnoCor(cor.hex)}
                          title={cor.label}
                        >
                          {turnoCor === cor.hex && <Check size={12} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        type="color" 
                        value={turnoCor} 
                        onChange={(e) => setTurnoCor(e.target.value)} 
                        className="h-8 w-12 p-0.5 border cursor-pointer rounded" 
                      />
                      <span className="text-xs text-muted-foreground font-mono">{turnoCor}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      disabled={createTurno.isPending || updateTurno.isPending}
                    >
                      {turnoId !== null ? "Salvar Alterações" : "Cadastrar Turno"}
                    </Button>
                    {turnoId !== null && (
                      <Button type="button" variant="outline" onClick={resetTurnoForm}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">Turnos de Trabalho</CardTitle>
                <CardDescription>Lista completa de turnos operacionais cadastrados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {turnosQuery.isLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Carregando turnos...</div>
                ) : !turnosQuery.data || turnosQuery.data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Nenhum turno cadastrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100/50">
                        <TableRow>
                          <TableHead className="w-28">Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Badge Visual</TableHead>
                          <TableHead className="text-center w-24">Status</TableHead>
                          <TableHead className="text-center w-28">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {turnosQuery.data.map((t) => (
                          <TableRow key={t.id} className={!t.ativo ? "opacity-60 bg-slate-50/30" : ""}>
                            <TableCell className="font-mono font-semibold text-indigo-600">{t.codigo}</TableCell>
                            <TableCell className="font-medium">{t.descricao}</TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: t.cor || "#6366f1", color: "#fff" }}>
                                {t.codigo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={t.ativo ? "default" : "secondary"} className={t.ativo ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}>
                                {t.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                  onClick={() => handleEditTurno(t)}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={t.ativo ? "h-8 w-8 text-amber-500 hover:text-amber-700" : "h-8 w-8 text-emerald-500 hover:text-emerald-700"}
                                  onClick={() => toggleAtivoTurno(t)}
                                  title={t.ativo ? "Inativar" : "Ativar"}
                                >
                                  {t.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if(window.confirm("Deseja realmente apagar este registro?")) {
                                      deleteTurno.mutate({ id: t.id });
                                    }
                                  }}
                                  title="Apagar"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* ========================================================
            TABS CONTENT: CAUSAS DE QUEBRA
           ======================================================== */}
        <TabsContent value="causas" className="grid grid-cols-1 lg:grid-cols-12 gap-6 outline-none">
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">
                  {causaId !== null ? "Editar Causa" : "Adicionar Causa"}
                </CardTitle>
                <CardDescription>Cadastre as causas comuns de quebras de peças</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveCausa} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="causaCodigo">Código Causa</Label>
                    <Input 
                      id="causaCodigo" 
                      placeholder="ex: CQ01 (opcional)" 
                      value={causaCodigo} 
                      onChange={(e) => setCausaCodigo(e.target.value.toUpperCase())} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="causaDescricao">Descrição da Causa *</Label>
                    <Input 
                      id="causaDescricao" 
                      placeholder="ex: SOLTOU VIROLA/BORDA" 
                      value={causaDescricao} 
                      onChange={(e) => setCausaDescricao(e.target.value.toUpperCase())} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Badge de Causa</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PALETA_CORES.map((cor) => (
                        <button
                          key={cor.hex}
                          type="button"
                          className="h-7 w-7 rounded-full border border-slate-300 relative transition-transform hover:scale-110 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cor.hex }}
                          onClick={() => setCausaCor(cor.hex)}
                          title={cor.label}
                        >
                          {causaCor === cor.hex && <Check size={12} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        type="color" 
                        value={causaCor} 
                        onChange={(e) => setCausaCor(e.target.value)} 
                        className="h-8 w-12 p-0.5 border cursor-pointer rounded" 
                      />
                      <span className="text-xs text-muted-foreground font-mono">{causaCor}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      disabled={createCausa.isPending || updateCausa.isPending}
                    >
                      {causaId !== null ? "Salvar Alterações" : "Cadastrar Causa"}
                    </Button>
                    {causaId !== null && (
                      <Button type="button" variant="outline" onClick={resetCausaForm}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">Causas de Quebra Cadastradas</CardTitle>
                <CardDescription>Lista de causas de quebra para análise de perdas (Pareto)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {causasQuery.isLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Carregando causas...</div>
                ) : !causasQuery.data || causasQuery.data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma causa cadastrada</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100/50">
                        <TableRow>
                          <TableHead className="w-28">Código</TableHead>
                          <TableHead>Descrição da Causa</TableHead>
                          <TableHead>Badge Visual</TableHead>
                          <TableHead className="text-center w-24">Status</TableHead>
                          <TableHead className="text-center w-28">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {causasQuery.data.map((c) => (
                          <TableRow key={c.id} className={!c.ativo ? "opacity-60 bg-slate-50/30" : ""}>
                            <TableCell className="font-mono font-semibold">{c.codigo || "-"}</TableCell>
                            <TableCell className="font-medium">{c.descricao}</TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: c.cor || "#ef4444", color: "#fff" }}>
                                {c.codigo || c.descricao.substring(0, 8)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={c.ativo ? "default" : "secondary"} className={c.ativo ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}>
                                {c.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                  onClick={() => handleEditCausa(c)}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={c.ativo ? "h-8 w-8 text-amber-500 hover:text-amber-700" : "h-8 w-8 text-emerald-500 hover:text-emerald-700"}
                                  onClick={() => toggleAtivoCausa(c)}
                                  title={c.ativo ? "Inativar" : "Ativar"}
                                >
                                  {c.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if(window.confirm("Deseja realmente apagar este registro?")) {
                                      deleteCausa.mutate({ id: c.id });
                                    }
                                  }}
                                  title="Apagar"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* ========================================================
            TABS CONTENT: MOTIVOS DE PARADA
           ======================================================== */}
        <TabsContent value="paradas" className="grid grid-cols-1 lg:grid-cols-12 gap-6 outline-none">
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">
                  {motivoId !== null ? "Editar Motivo" : "Adicionar Motivo"}
                </CardTitle>
                <CardDescription>Cadastre as causas de parada de máquina operacional</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveMotivo} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivoCodigo">Código Motivo</Label>
                    <Input 
                      id="motivoCodigo" 
                      placeholder="ex: PR01 (opcional)" 
                      value={motivoCodigo} 
                      onChange={(e) => setMotivoCodigo(e.target.value.toUpperCase())} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivoDescricao">Descrição do Motivo *</Label>
                    <Input 
                      id="motivoDescricao" 
                      placeholder="ex: TROCA DE FERRAMENTAL" 
                      value={motivoDescricao} 
                      onChange={(e) => setMotivoDescricao(e.target.value.toUpperCase())} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Badge de Parada</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PALETA_CORES.map((cor) => (
                        <button
                          key={cor.hex}
                          type="button"
                          className="h-7 w-7 rounded-full border border-slate-300 relative transition-transform hover:scale-110 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cor.hex }}
                          onClick={() => setMotivoCor(cor.hex)}
                          title={cor.label}
                        >
                          {motivoCor === cor.hex && <Check size={12} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        type="color" 
                        value={motivoCor} 
                        onChange={(e) => setMotivoCor(e.target.value)} 
                        className="h-8 w-12 p-0.5 border cursor-pointer rounded" 
                      />
                      <span className="text-xs text-muted-foreground font-mono">{motivoCor}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      disabled={createMotivo.isPending || updateMotivo.isPending}
                    >
                      {motivoId !== null ? "Salvar Alterações" : "Cadastrar Motivo"}
                    </Button>
                    {motivoId !== null && (
                      <Button type="button" variant="outline" onClick={resetMotivoForm}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg">Motivos de Parada Cadastrados</CardTitle>
                <CardDescription>Lista de causas de paradas de máquina ocorridas no repuxo</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {motivosParadaQuery.isLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Carregando motivos...</div>
                ) : !motivosParadaQuery.data || motivosParadaQuery.data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Nenhum motivo cadastrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100/50">
                        <TableRow>
                          <TableHead className="w-28">Código</TableHead>
                          <TableHead>Descrição do Motivo</TableHead>
                          <TableHead>Badge Visual</TableHead>
                          <TableHead className="text-center w-24">Status</TableHead>
                          <TableHead className="text-center w-28">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {motivosParadaQuery.data.map((m) => (
                          <TableRow key={m.id} className={!m.ativo ? "opacity-60 bg-slate-50/30" : ""}>
                            <TableCell className="font-mono font-semibold">{m.codigo || "-"}</TableCell>
                            <TableCell className="font-medium">{m.descricao}</TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: m.cor || "#f59e0b", color: "#fff" }}>
                                {m.codigo || m.descricao.substring(0, 8)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={m.ativo ? "default" : "secondary"} className={m.ativo ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}>
                                {m.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                  onClick={() => handleEditMotivo(m)}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={m.ativo ? "h-8 w-8 text-amber-500 hover:text-amber-700" : "h-8 w-8 text-emerald-500 hover:text-emerald-700"}
                                  onClick={() => toggleAtivoMotivo(m)}
                                  title={m.ativo ? "Inativar" : "Ativar"}
                                >
                                  {m.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if(window.confirm("Deseja realmente apagar este registro?")) {
                                      deleteMotivo.mutate({ id: m.id });
                                    }
                                  }}
                                  title="Apagar"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* ========================================================
            TABS CONTENT: POLÍTICA DE JORNADA
           ======================================================== */}
        <TabsContent value="jornada" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulário */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border border-border/80 shadow-md">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar size={18} className="text-violet-500" />
                    Configurar Política de Jornada
                  </CardTitle>
                  <CardDescription>Define os horários e dias de trabalho da fábrica.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <JornadaForm utils={utils} politicasQuery={politicasQuery} editData={politicaEdit} onClearEdit={() => setPoliticaEdit(null)} />
                </CardContent>
              </Card>
            </div>
            {/* Lista */}
            <div className="lg:col-span-7">
              <Card className="border border-border/80 shadow-md">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Zap size={18} className="text-violet-500" />
                    Políticas Cadastradas
                  </CardTitle>
                  <CardDescription>Histórico de políticas de jornada (ordem por vigência).</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!politicasQuery.data || politicasQuery.data.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                      Nenhuma política cadastrada ainda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Dias</TableHead>
                            <TableHead>Manhã</TableHead>
                            <TableHead>Tarde</TableHead>
                            <TableHead>Vigência</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center w-28">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {politicasQuery.data.map((p) => {
                            const dias = [
                              p.segunda && "Seg", p.terca && "Ter", p.quarta && "Qua",
                              p.quinta && "Qui", p.sexta && "Sex", p.sabado && "Sáb", p.domingo && "Dom"
                            ].filter(Boolean).join(", ");
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-semibold text-sm">{p.descricao}</TableCell>
                                <TableCell className="text-xs text-slate-600">{dias}</TableCell>
                                <TableCell className="text-xs">{p.manhaInicio}–{p.manhaFim}</TableCell>
                                <TableCell className="text-xs">
                                  <div>Seg-Qui: {p.tardeInicio}–{p.tardeFimSegQui}</div>
                                  <div>Sex: {p.tardeInicio}–{p.tardeFimSex}</div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div>{(() => { const d = p.vigenciaInicio; if (!d) return "—"; if (d instanceof Date) return d.toISOString().split("T")[0]; return String(d).split("T")[0]; })()}</div>
                                  {p.vigenciaFim ? <div className="text-slate-400">até {(() => { const d = p.vigenciaFim; if (!d) return "—"; if (d instanceof Date) return d.toISOString().split("T")[0]; return String(d).split("T")[0]; })()}</div> : <div className="text-emerald-500 font-semibold">Vigente</div>}
                                </TableCell>
                                <TableCell>
                                  {p.ativo ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">Ativa</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px] border border-slate-200">Inativa</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-indigo-600 hover:text-indigo-800"
                                      onClick={() => setPoliticaEdit(p)}
                                      title="Editar"
                                    >
                                      <Pencil size={14} />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() => {
                                        if(window.confirm("Deseja realmente inativar/apagar esta política?")) {
                                          deleteJornada.mutate({ id: p.id });
                                        }
                                      }}
                                      title="Apagar"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// COMPONENTE DO FORMULÁRIO DE JORNADA
// ==========================================
function JornadaForm({ utils, politicasQuery, editData, onClearEdit }: { utils: any; politicasQuery: any; editData?: any; onClearEdit?: () => void }) {
  const [descricao, setDescricao] = useState("Política Padrão Nobre");
  const [segunda, setSegunda] = useState(true);
  const [terca, setTerca] = useState(true);
  const [quarta, setQuarta] = useState(true);
  const [quinta, setQuinta] = useState(true);
  const [sexta, setSexta] = useState(true);
  const [sabado, setSabado] = useState(false);
  const [domingo, setDomingo] = useState(false);
  const [manhaInicio, setManhaInicio] = useState("07:30");
  const [manhaFim, setManhaFim] = useState("12:00");
  const [tardeInicio, setTardeInicio] = useState("13:00");
  const [tardeFimSegQui, setTardeFimSegQui] = useState("17:30");
  const [tardeFimSex, setTardeFimSex] = useState("16:30");
  const [custoHora, setCustoHora] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState("2024-01-01");
  const [vigenciaFim, setVigenciaFim] = useState("");

  // Cálculo de preview de jornada
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const manha = Math.max(0, toMin(manhaFim) - toMin(manhaInicio));
  const tardeSegQui = Math.max(0, toMin(tardeFimSegQui) - toMin(tardeInicio));
  const tardeSex = Math.max(0, toMin(tardeFimSex) - toMin(tardeInicio));
  const diasNormais = [segunda, terca, quarta, quinta].filter(Boolean).length;
  const fmtH = (m: number) => `${Math.floor(m / 60)}h${m % 60 > 0 ? String(m % 60).padStart(2, '0') + 'min' : ''}`;
  const jornadaDiaNormal = manha + tardeSegQui;
  const jornadaDiaSex = manha + tardeSex;
  const semana = diasNormais * jornadaDiaNormal + (sexta ? jornadaDiaSex : 0);
  const mes = Math.round((semana / 5) * 22);

  useEffect(() => {
    if (editData) {
      setDescricao(editData.descricao || "");
      setSegunda(editData.segunda ?? true);
      setTerca(editData.terca ?? true);
      setQuarta(editData.quarta ?? true);
      setQuinta(editData.quinta ?? true);
      setSexta(editData.sexta ?? true);
      setSabado(editData.sabado ?? false);
      setDomingo(editData.domingo ?? false);
      setManhaInicio(editData.manhaInicio || "07:30");
      setManhaFim(editData.manhaFim || "12:00");
      setTardeInicio(editData.tardeInicio || "13:00");
      setTardeFimSegQui(editData.tardeFimSegQui || "17:30");
      setTardeFimSex(editData.tardeFimSex || "16:30");
      setCustoHora(editData.custoHoraReais || "");
      
      const fmtDate = (d: any) => {
        if (!d) return "";
        if (d instanceof Date) return d.toISOString().split("T")[0];
        return String(d).split("T")[0];
      };
      setVigenciaInicio(fmtDate(editData.vigenciaInicio) || "2024-01-01");
      setVigenciaFim(fmtDate(editData.vigenciaFim) || "");
    } else {
      setDescricao("Política Padrão Nobre");
      setSegunda(true); setTerca(true); setQuarta(true); setQuinta(true); setSexta(true); setSabado(false); setDomingo(false);
      setManhaInicio("07:30"); setManhaFim("12:00"); setTardeInicio("13:00"); setTardeFimSegQui("17:30"); setTardeFimSex("16:30");
      setCustoHora("");
      setVigenciaInicio(new Date().toISOString().split("T")[0]);
      setVigenciaFim("");
    }
  }, [editData]);

  const createMutation = trpc.politicaJornada.create.useMutation({
    onSuccess: () => {
      toast.success("Política de jornada criada com sucesso!");
      utils.politicaJornada.list.invalidate();
      if(onClearEdit) onClearEdit();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar política"),
  });

  const updateMutation = trpc.politicaJornada.update.useMutation({
    onSuccess: () => {
      toast.success("Política atualizada com sucesso!");
      utils.politicaJornada.list.invalidate();
      if(onClearEdit) onClearEdit();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar política"),
  });

  const handleSave = () => {
    if (!descricao.trim()) { toast.error("Informe uma descrição"); return; }
    if (!vigenciaInicio) { toast.error("Informe a data de início de vigência"); return; }
    const timeReg = /^\d{2}:\d{2}$/;
    if (!timeReg.test(manhaInicio) || !timeReg.test(manhaFim) || !timeReg.test(tardeInicio) || !timeReg.test(tardeFimSegQui) || !timeReg.test(tardeFimSex)) {
      toast.error("Verifique os horários (formato HH:MM)");
      return;
    }
    const payload = {
      descricao,
      segunda, terca, quarta, quinta, sexta, sabado, domingo,
      manhaInicio, manhaFim, tardeInicio, tardeFimSegQui, tardeFimSex,
      custoHoraReais: custoHora ? Number(custoHora) : null,
      vigenciaInicio: new Date(vigenciaInicio + "T00:00:00"),
      vigenciaFim: vigenciaFim ? new Date(vigenciaFim + "T00:00:00") : null,
    };
    
    if (editData) {
      updateMutation.mutate({ id: editData.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const DayToggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
        value ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Descrição da Política</Label>
        <Input value={descricao} onChange={e => setDescricao(e.target.value)} className="h-9 text-sm" placeholder="Ex: Política Padrão 2026" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Dias de Trabalho</Label>
        <div className="flex flex-wrap gap-2">
          <DayToggle label="Seg" value={segunda} onChange={setSegunda} />
          <DayToggle label="Ter" value={terca} onChange={setTerca} />
          <DayToggle label="Qua" value={quarta} onChange={setQuarta} />
          <DayToggle label="Qui" value={quinta} onChange={setQuinta} />
          <DayToggle label="Sex" value={sexta} onChange={setSexta} />
          <DayToggle label="Sáb" value={sabado} onChange={setSabado} />
          <DayToggle label="Dom" value={domingo} onChange={setDomingo} />
        </div>
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-semibold">Turno Manhã (todos os dias)</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-slate-400">Início</Label>
            <Input type="time" value={manhaInicio} onChange={e => setManhaInicio(e.target.value)} className="h-9 text-xs" />
          </div>
          <span className="text-slate-400 text-xs mt-4">até</span>
          <div className="flex-1">
            <Label className="text-[10px] text-slate-400">Fim</Label>
            <Input type="time" value={manhaFim} onChange={e => setManhaFim(e.target.value)} className="h-9 text-xs" />
          </div>
          <span className="text-xs text-violet-600 font-semibold mt-4 whitespace-nowrap">{fmtH(manha)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Início do Turno Tarde (todos os dias)</Label>
        <Input type="time" value={tardeInicio} onChange={e => setTardeInicio(e.target.value)} className="h-9 text-xs" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Fim Tarde — Seg a Qui</Label>
        <div className="flex items-center gap-2">
          <Input type="time" value={tardeFimSegQui} onChange={e => setTardeFimSegQui(e.target.value)} className="h-9 text-xs flex-1" />
          <span className="text-xs text-violet-600 font-semibold whitespace-nowrap">{fmtH(jornadaDiaNormal)}/dia</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Fim Tarde — Sexta-feira</Label>
        <div className="flex items-center gap-2">
          <Input type="time" value={tardeFimSex} onChange={e => setTardeFimSex(e.target.value)} className="h-9 text-xs flex-1" />
          <span className="text-xs text-violet-600 font-semibold whitespace-nowrap">{fmtH(jornadaDiaSex)}/dia</span>
        </div>
      </div>

      {/* Preview automático */}
      <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-violet-700">📊 Preview da Jornada</p>
        <p className="text-slate-600">Semanal: <strong className="text-violet-700">{fmtH(semana)}</strong></p>
        <p className="text-slate-600">Mensal estimado (22 dias úteis): <strong className="text-violet-700">{fmtH(mes)}</strong></p>
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-semibold">Custo/hora do operador (R$) — opcional</Label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={custoHora}
          onChange={e => setCustoHora(e.target.value)}
          className="h-9 text-xs"
          placeholder="Ex: 25.00"
        />
        <p className="text-[10px] text-slate-400">Se preenchido, ativa cálculo de custo de produção por operador.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Vigência</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-slate-400">Início</Label>
            <Input type="date" value={vigenciaInicio} onChange={e => setVigenciaInicio(e.target.value)} className="h-9 text-xs" />
          </div>
          <span className="text-slate-400 text-xs mt-4">até</span>
          <div className="flex-1">
            <Label className="text-[10px] text-slate-400">Fim (opcional)</Label>
            <Input type="date" value={vigenciaFim} onChange={e => setVigenciaFim(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Deixe "Fim" em branco para política vigente indefinidamente.</p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
        >
          <Plus size={15} className="mr-2" />
          {editData ? "Atualizar Política" : "Salvar Política de Jornada"}
        </Button>
        {editData && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onClearEdit && onClearEdit()}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
