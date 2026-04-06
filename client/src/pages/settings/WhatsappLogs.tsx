import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw, ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { DeleteLogsDialog } from "@/components/DeleteLogsDialog";

export default function WhatsappLogs() {
  const { isSuperAdmin } = useAuth();
  const [limit, setLimit] = useState(50);
  const { data: logs, isLoading, refetch, isFetching } = trpc.whatsapp.getCommunicationLogs.useQuery({ limit });

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Logs WhatsApp (Meta Cloud API)</h2>
            <p className="text-muted-foreground">Monitoramento técnico exclusivo de tráfego WhatsApp via API oficial da Meta.</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <DeleteLogsDialog type="whatsapp" onSuccess={() => refetch()} />
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Card className="shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
            <CardDescription>Visualize o tráfego bruto (JSON) enviado e recebido.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-[100px]">Direção</TableHead>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Carregando logs...
                      </TableCell>
                    </TableRow>
                  ) : logs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum log de comunicação encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <TableCell>
                          {log.direction === "inbound" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <ArrowDownLeft className="h-3 w-3" /> Entrada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                              <ArrowUpRight className="h-3 w-3" /> Saída
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.phoneNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 gap-2">
                                <Search className="h-4 w-4" /> Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                              <DialogHeader>
                                <DialogTitle>Raw Payload JSON</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="flex-1 mt-4 rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-50">
                                <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                                {log.errorMessage && (
                                  <div className="mt-4 p-2 border border-red-900 bg-red-950/50 text-red-200 rounded">
                                    <p className="font-bold">Erro:</p>
                                    <p>{log.errorMessage}</p>
                                  </div>
                                )}
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
            {logs && logs.length >= 50 && (
                <div className="mt-4 flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => setLimit(l => l + 50)}>
                        Carregar mais logs
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



