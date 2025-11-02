import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(search) ||
      log.userEmail?.toLowerCase().includes(search) ||
      log.entityCode?.toLowerCase().includes(search) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search)
    );
  });

  const handleExportCSV = () => {
    const csvContent = [
      ["Data/Hora", "Usuário", "Ação", "Entidade", "Código", "Detalhes"],
      ...filteredLogs.map((log: any) => [
        format(new Date(log.createdAt), "dd/MM/yyyy, HH:mm:ss", { locale: ptBR }),
        `${log.userName || 'N/A'} (${log.userEmail || 'N/A'})`,
        log.action,
        log.entity,
        log.entityCode || '-',
        JSON.stringify(log.details || {})
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
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
                    <SelectItem value="Criação">Criação</SelectItem>
                    <SelectItem value="Atualização">Atualização</SelectItem>
                    <SelectItem value="Deleção">Deleção</SelectItem>
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
                    <SelectItem value="Produto">Produto</SelectItem>
                    <SelectItem value="Lançamento">Lançamento</SelectItem>
                    <SelectItem value="Usuário">Usuário</SelectItem>
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
                          {format(new Date(log.createdAt), "dd/MM/yyyy, HH:mm:ss", { locale: ptBR })}
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
                            {log.action === "create" ? "Criação" :
                             log.action === "update" ? "Atualização" :
                             log.action === "delete" ? "Deleção" :
                             log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{log.entity}</TableCell>
                        <TableCell className="font-mono text-sm text-blue-600">{log.entityCode || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">
                          {JSON.stringify(log.details || {})}
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
