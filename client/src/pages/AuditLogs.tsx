import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";

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

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

function renderDetailsMessage(details: any): string {
  if (!details) return "";
  if (typeof details.message === "string" && details.message.trim()) {
    return details.message;
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
  if (parts.length > 0) {
    return parts.join(" • ");
  }
  return typeof details === "object" ? JSON.stringify(details) : String(details);
}

function renderDetailsTooltip(details: any): string | undefined {
  if (!details) return undefined;
  if (typeof details === "object") {
    return JSON.stringify(details, null, 2);
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

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("Todas");
  const [entityFilter, setEntityFilter] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState("");

  // Buscar logs do backend
  const { data: logs = [], isLoading } = trpc.auditLogs.list.useQuery({
    action: actionFilter !== "Todas" ? actionFilter : undefined,
    entity: entityFilter !== "Todas" ? entityFilter : undefined,
    limit: 100,
  });

  const filteredLogs = logs
    .filter((log: any) => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        log.userName?.toLowerCase().includes(search) ||
        log.userEmail?.toLowerCase().includes(search) ||
        log.entityCode?.toLowerCase().includes(search) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(search)
      );
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleExportCSV = () => {
    const csvContent = [
      ["Data/Hora", "Usuário", "Ação", "Entidade", "Código", "Mensagem", "Detalhes"],
      ...filteredLogs.map((log: any) => {
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredLogs.length}</span> registros encontrados
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
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
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log: any, index: number) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
