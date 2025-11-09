import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Calendar as CalendarIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  login: "Login",
  finalize: "Finalização",
  reopen: "Reabertura",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  production_entry: "Lançamento de Produção",
  production_day: "Dia de Produção",
  product: "Produto",
};

const ENTRY_SOURCE_LABELS: Record<string, string> = {
  code_input: "Código digitado",
  partial_search: "Busca parcial",
  barcode: "Código de barras",
  camera: "Câmera",
  increment_button: "Botão de incremento",
  decrement_button: "Botão de decremento",
  manual_edit: "Edição manual",
};

type DatePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last7days", label: "Últimos 7 dias" },
  { key: "last30days", label: "Últimos 30 dias" },
  { key: "thisMonth", label: "Este mês" },
  { key: "lastMonth", label: "Mês passado" },
  { key: "custom", label: "Personalizado" },
];

const BRAZIL_TIMEZONE = "America/Sao_Paulo";
const PAGE_SIZE = 50;

function renderDetailsMessage(details: any): string {
  if (!details) return "";
  const sourceLabel = details.source ? ENTRY_SOURCE_LABELS[details.source] ?? details.source : undefined;
  if (typeof details.message === "string" && details.message.trim()) {
    return sourceLabel ? `${details.message} • Origem: ${sourceLabel}` : details.message;
  }
  const parts: string[] = [];
  if (details.quantity !== undefined) {
    parts.push(`Quantidade: ${details.quantity}`);
  }
  if (details.sessionDate) {
    parts.push(`Dia: ${formatDate(details.sessionDate)}`);
  }
  if (details.checked !== undefined) {
    parts.push(`Conferido? ${details.checked ? "Sim" : "Não"}`);
  }
  if (sourceLabel) {
    parts.push(`Origem: ${sourceLabel}`);
  }
  if (parts.length > 0) {
    return parts.join(" • ");
  }
  return typeof details === "object" ? JSON.stringify(details) : String(details);
}

function renderDetailsTooltip(details: any): string | undefined {
  if (!details) return undefined;
  const sourceLabel = details.source ? ENTRY_SOURCE_LABELS[details.source] ?? details.source : undefined;
  if (typeof details === "object") {
    const enriched = sourceLabel ? { ...details, sourceLabel } : details;
    return JSON.stringify(enriched, null, 2);
  }
  return String(details);
}

function formatDate(value: any): string {
  if (!value) return "";
  const baseDate = value instanceof Date ? value : new Date(typeof value === "string" ? `${value}T00:00:00` : value);
  if (Number.isNaN(baseDate.getTime())) {
    return String(value);
  }
  return baseDate.toLocaleDateString("pt-BR", { timeZone: BRAZIL_TIMEZONE });
}

function formatDateTimeBrazil(value: any): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }
  return date.toLocaleString("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getTodayRange(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

function getPresetRange(preset: DatePreset): DateRange | undefined {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return getTodayRange();
    case "yesterday": {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    case "last7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: endOfToday };
    }
    case "last30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: endOfToday };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    default:
      return undefined;
  }
}

function startOfDayISOString(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfDayISOString(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from || !range.to) return "Selecione o período";
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${formatter.format(range.from)} - ${formatter.format(range.to)}`;
}

function formatDateInput(value: Date | undefined): string {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applyPeriodMask(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "").slice(0, 16);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
    digits.slice(8, 10),
    digits.slice(10, 12),
    digits.slice(12, 16),
  ];

  let formatted = parts[0] ?? "";
  if (digits.length > 2) {
    formatted += `/${parts[1] ?? ""}`;
  }
  if (digits.length > 4) {
    formatted += `/${parts[2] ?? ""}`;
  }
  if (digits.length > 8) {
    formatted += ` - ${parts[3] ?? ""}`;
  }
  if (digits.length > 10) {
    formatted += `/${parts[4] ?? ""}`;
  }
  if (digits.length > 12) {
    formatted += `/${parts[5] ?? ""}`;
  }

  return formatted;
}

function parsePeriodInput(value: string): DateRange | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, dayStart, monthStart, yearStart, dayEnd, monthEnd, yearEnd] = match;
  const start = new Date(Number(yearStart), Number(monthStart) - 1, Number(dayStart));
  const end = new Date(Number(yearEnd), Number(monthEnd) - 1, Number(dayEnd));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) return undefined;

  return { from: start, to: end };
}

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("Todas");
  const [entityFilter, setEntityFilter] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getTodayRange());
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("today");

  const [periodInputValue, setPeriodInputValue] = useState<string>(() => formatRangeLabel(dateRange));
  const [isPeriodEditable, setIsPeriodEditable] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const periodInputRef = useRef<HTMLInputElement>(null);

  const applyPreset = (preset: DatePreset) => {
    if (preset === "custom") {
      setSelectedPreset("custom");
      setIsPopoverOpen(false);
      setIsPeriodEditable(true);
      setTimeout(() => {
        periodInputRef.current?.focus();
        periodInputRef.current?.select();
      }, 0);
      return;
    }

    const range = getPresetRange(preset);
    setSelectedPreset(preset);
    if (range) {
      setDateRange(range);
      setIsPeriodEditable(false);
      setIsPopoverOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    setDateRange(range);
    if (range?.from && range?.to) {
      setIsPeriodEditable(false);
      setIsPopoverOpen(false);
    }
  };

  useEffect(() => {
    if (!isPeriodEditable) {
      setPeriodInputValue(formatRangeLabel(dateRange));
    }
  }, [dateRange, isPeriodEditable]);

  const handlePeriodDoubleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.preventDefault();
    setIsPopoverOpen(false);
    setIsPeriodEditable(true);
    setSelectedPreset("custom");
    setTimeout(() => {
      periodInputRef.current?.focus();
      periodInputRef.current?.select();
    }, 0);
  };

  const handlePeriodInputChange = (value: string) => {
    if (!isPeriodEditable) return;
    setPeriodInputValue(applyPeriodMask(value));
  };

  const commitPeriodInput = () => {
    if (!isPeriodEditable) return;

    const trimmed = periodInputValue.trim();
    if (!trimmed) {
      setDateRange(undefined);
      setIsPeriodEditable(false);
      return;
    }

    const parsed = parsePeriodInput(periodInputValue);
    if (!parsed) {
      setPeriodInputValue(formatRangeLabel(dateRange));
      setIsPeriodEditable(false);
      return;
    }

    setDateRange(parsed);
    setSelectedPreset("custom");
    setIsPeriodEditable(false);
  };

  const handlePeriodKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPeriodEditable) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commitPeriodInput();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPeriodInputValue(formatRangeLabel(dateRange));
      setIsPeriodEditable(false);
    }
  };

  const queryInput = useMemo(() => (
    {
      action: actionFilter !== "Todas" ? actionFilter : undefined,
      entity: entityFilter !== "Todas" ? entityFilter : undefined,
      search: searchQuery.trim() ? searchQuery.trim() : undefined,
      startDate: startOfDayISOString(dateRange?.from),
      endDate: endOfDayISOString(dateRange?.to),
      limit: PAGE_SIZE,
    }
  ), [actionFilter, entityFilter, searchQuery, dateRange]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.auditLogs.list.useInfiniteQuery(queryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const logs = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const handleResetFilters = () => {
    const todayRange = getTodayRange();
    setActionFilter("Todas");
    setEntityFilter("Todas");
    setSearchQuery("");
    setDateRange(todayRange);
    setSelectedPreset("today");
    setIsPeriodEditable(false);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Data/Hora", "Usuário", "Ação", "Entidade", "Código", "Mensagem", "Detalhes"],
      ...logs.map((log: any) => {
        const message = typeof log.details?.message === "string" ? log.details.message : "";
        const formattedDate = formatDateTimeBrazil(log.createdAt);
        return [
          formattedDate,
          `${log.userName || "N/A"} (${log.userEmail || "N/A"})`,
          ACTION_LABELS[log.action] ?? log.action,
          ENTITY_LABELS[log.entity] ?? log.entity,
          log.entityCode || "-",
          message,
          JSON.stringify(log.details || {}),
        ];
      })
    ]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const todayLabel = new Date().toLocaleDateString("pt-BR", { timeZone: BRAZIL_TIMEZONE }).replaceAll("/", "-");
    link.setAttribute("download", `audit-logs-${todayLabel}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
        <p className="text-muted-foreground mt-2">Rastreie todas as ações realizadas no sistema</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="action-filter">Ação</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger id="action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="create">Criação</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                    <SelectItem value="delete">Remoção</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="finalize">Finalização</SelectItem>
                    <SelectItem value="reopen">Reabertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entity-filter">Entidade</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger id="entity-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="production_entry">Lançamento de Produção</SelectItem>
                    <SelectItem value="production_day">Dia de Produção</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="period-input">Período</Label>
                <Popover
                  open={isPopoverOpen}
                  onOpenChange={(open) => {
                    setIsPopoverOpen(open);
                    if (open) {
                      setIsPeriodEditable(false);
                    }
                  }}
                >
                  <PopoverAnchor asChild>
                    <div className="relative mt-1">
                      <Input
                        id="period-input"
                        ref={periodInputRef}
                        value={periodInputValue}
                        readOnly={!isPeriodEditable}
                        maxLength={23}
                        placeholder="Selecione o período"
                        onDoubleClick={handlePeriodDoubleClick}
                        onBlur={commitPeriodInput}
                        onKeyDown={handlePeriodKeyDown}
                        onChange={(event) => handlePeriodInputChange(event.target.value)}
                        className="pr-12"
                      />
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 px-0"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </div>
                  </PopoverAnchor>
                  <PopoverContent className="w-auto p-0" align="end" side="bottom" sideOffset={4}>
                    <div className="flex flex-col md:flex-row">
                      <div className="flex min-w-[180px] flex-col border-b md:border-b-0 md:border-r">
                        {DATE_PRESETS.map((preset) => (
                          <Button
                            key={preset.key}
                            variant={selectedPreset === preset.key ? "default" : "ghost"}
                            className={cn(
                              "justify-start rounded-none px-4 py-2 text-sm",
                              selectedPreset === preset.key ? "font-semibold" : ""
                            )}
                            onClick={() => applyPreset(preset.key)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-3">
                        <Calendar
                          initialFocus
                          mode="range"
                          numberOfMonths={2}
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={handleRangeSelect}
                        />
                        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDateRange(undefined);
                              setSelectedPreset("custom");
                              setIsPeriodEditable(false);
                              setPeriodInputValue("");
                              setIsPopoverOpen(false);
                            }}
                          >
                            Limpar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const range = getTodayRange();
                              setDateRange(range);
                              setSelectedPreset("today");
                              setIsPeriodEditable(false);
                              setIsPopoverOpen(false);
                            }}
                          >
                            Hoje
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="mt-1 text-xs text-muted-foreground">Clique duas vezes para editar manualmente no formato DD/MM/AAAA - DD/MM/AAAA.</p>
              </div>
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Usuário, email ou código..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{logs.length}</span> registros carregados
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">Carregando logs...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="w-[120px]">Ação</TableHead>
                    <TableHead className="w-[120px]">Entidade</TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any, index: number) => (
                      <TableRow key={log.id} className={index % 2 === 0 ? "bg-amber-50/50" : "bg-white"}>
                        <TableCell className="text-sm">
                          {formatDateTimeBrazil(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{log.userName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{log.userEmail || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${
                            log.action === "create" ? "text-green-600" :
                            log.action === "update" ? "text-blue-600" :
                            log.action === "delete" ? "text-red-600" :
                            "text-gray-600"
                          }`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{ENTITY_LABELS[log.entity] ?? log.entity}</TableCell>
                        <TableCell className="font-mono text-sm text-blue-600">{log.entityCode || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[320px]" title={renderDetailsTooltip(log.details)}>
                          <span className="block truncate">{renderDetailsMessage(log.details)}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
