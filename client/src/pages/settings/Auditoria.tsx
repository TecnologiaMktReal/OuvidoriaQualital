import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  RefreshCw, 
  Search, 
  Filter, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Monitor,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { DeleteLogsDialog } from "@/components/DeleteLogsDialog";

export default function Auditoria() {
  const { isSuperAdmin } = useAuth();
  const [limit, setLimit] = useState(50);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [searchEntity, setSearchEntity] = useState("");

  const { data: logsData, isLoading: isLoadingLogs, refetch, isFetching } = trpc.audit.list.useQuery({ 
    limit, 
    action: actionFilter === "all" ? undefined : actionFilter,
    userId: userFilter === "all" ? undefined : Number(userFilter),
    entity: searchEntity || undefined
  });

  const { data: filtersData } = trpc.audit.getFilters.useQuery();

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE")) return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">CRIAR</Badge>;
    if (act.includes("UPDATE")) return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">ATUALIZAR</Badge>;
    if (act.includes("DELETE")) return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">EXCLUIR</Badge>;
    if (act.includes("LOGIN")) return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">LOGIN</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <Layout>
      <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Auditoria do Sistema
            </h2>
            <p className="text-muted-foreground">
              Rastreamento completo de todas as ações administrativas e operacionais.
            </p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <DeleteLogsDialog type="audit" onSuccess={() => refetch()} />
            )}
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()} 
                disabled={isLoadingLogs || isFetching}
                className="bg-white dark:bg-slate-900 shadow-sm"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="shadow-md border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b">
             <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Filter size={16} /> Painel de Filtros
             </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ação</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {filtersData?.actions.map(act => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Usuário</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {filtersData?.users.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Pesquisar Entidade / Página</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: Clientes, Tickets, Contratos..." 
                    className="pl-9 bg-white dark:bg-slate-900" 
                    value={searchEntity}
                    onChange={(e) => setSearchEntity(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Resultados */}
        <Card className="shadow-xl border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px] py-4">Usuário</TableHead>
                    <TableHead className="w-[120px]">Ação</TableHead>
                    <TableHead>Entidade / Recurso</TableHead>
                    <TableHead className="w-[200px]">Página</TableHead>
                    <TableHead className="w-[180px]">Data e Hora</TableHead>
                    <TableHead className="text-right pr-6">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLogs ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center bg-white/50 dark:bg-slate-950/50">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                            <p className="text-sm font-medium text-slate-500 animate-pulse">Consultando registros históricos...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logsData?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center bg-white/50 dark:bg-slate-950/50">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Activity size={40} className="text-slate-200" />
                            <p>Nenhum registro de auditoria encontrado para os filtros aplicados.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logsData?.items.map((log) => (
                      <TableRow key={log.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors border-b">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                              <AvatarImage src={log.userPhoto || undefined} />
                              <AvatarFallback className="bg-yellow-100 text-yellow-700 text-[10px] font-bold">
                                {log.userName?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">
                                {log.userName || 'Sistema / Anon'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono tracking-tighter">ID: #{log.userId || '--'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {log.entity || '-'}
                            </span>
                            {log.entityId && (
                                <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0 h-4 font-mono font-normal">
                                    ID: {log.entityId}
                                </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                            <Monitor size={12} className="opacity-50" />
                            <span className="truncate" title={log.page || '-'}>{log.page || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <Calendar size={12} className="text-yellow-600" />
                              {format(new Date(log.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Clock size={12} />
                              {format(new Date(log.createdAt), "HH:mm:ss")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white dark:hover:bg-slate-800 shadow-none border-none">
                                <Eye className="h-4 w-4 text-slate-500 group-hover:text-yellow-600 transition-colors" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
                              <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900 border-b">
                                <div className="flex items-center justify-between pr-8">
                                    <DialogTitle className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
                                            <Activity size={20} />
                                        </div>
                                        <span>Detalhes da Ocorrência</span>
                                    </DialogTitle>
                                    <Badge variant="outline" className="font-mono">{log.ipAddress || '0.0.0.0'}</Badge>
                                </div>
                              </DialogHeader>
                              
                              <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                  {/* Info topo */}
                                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-slate-500 uppercase">Contexto</p>
                                          <p className="text-sm font-semibold">{log.entity || 'Geral'} / {log.action}</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-slate-500 uppercase">Hostname / IP</p>
                                          <div className="flex items-center gap-1.5 text-sm font-medium">
                                              <Globe size={14} className="text-blue-500" />
                                              <span>{log.ipAddress || 'Não registrado'}</span>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Payload Data */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                        Metadados da Ação (JSON)
                                    </h4>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-yellow-500/5 rounded-xl blur-xl group-hover:bg-yellow-500/10 transition-all" />
                                        <pre className="relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-[13px] leading-relaxed shadow-sm overflow-x-auto text-slate-700 dark:text-slate-300">
                                            {JSON.stringify(log.details || { info: "Sem dados adicionais" }, null, 2)}
                                        </pre>
                                    </div>
                                  </div>

                                  <div className="pt-4 border-t text-center text-[10px] text-slate-400">
                                      ID do Registro de Auditoria: <span className="font-mono">LOG-{log.id.toString().padStart(6, '0')}</span>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {logsData && logsData.items.length >= 50 && (
                <div className="p-4 border-t flex justify-center bg-slate-50/30 dark:bg-slate-900/30">
                    <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 50)} className="gap-2 bg-white dark:bg-slate-900 shadow-sm border-slate-200">
                        Carregar mais registros
                        <ChevronDown size={14} />
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



