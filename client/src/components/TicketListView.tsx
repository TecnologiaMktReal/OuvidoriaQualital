
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  History,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Hourglass,
  ArrowUpDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TicketListViewProps {
  tickets: any[];
  isLoading: boolean;
  onOpenChat: (ticket: any) => void;
  onViewHistory: (ticket: any) => void;
  onViewCliente: (ticket: any) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number; // Not always available in infinite query, but good to have
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  sortConfig?: { field: string; direction: 'asc' | 'desc' };
  onSort?: (field: string) => void;
  selectedIds?: number[];
  onSelect?: (id: number) => void;
  onSelectAll?: () => void;
}

export function TicketListView({
  tickets,
  isLoading,
  onOpenChat,
  onViewHistory,
  onViewCliente,
  pagination,
  sortConfig,
  onSort,
  selectedIds = [],
  onSelect,
  onSelectAll,
}: TicketListViewProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Carregando tickets...</div>;
  }

  if (tickets.length === 0) {
    return <div className="p-8 text-center text-slate-500">Nenhum ticket encontrado.</div>;
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const formatDurationFull = (start: string | Date, end?: string | Date | null) => {
    if (!start) return "-";
    const startDate = new Date(start).getTime();
    const endDate = end ? new Date(end).getTime() : Date.now();
    const diff = endDate - startDate;
    
    if (diff < 0) return "00:00:00";
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const formatDuration = (ms: number) => {
    if (!ms) return "-";
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  // Helper para renderizar badges de status do Cliente
  const getclienteStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ativo":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Ativo</Badge>;
      case "inativo":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Inativo</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500">{status || "-"}</Badge>;
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-950">
            <TableRow>
              <TableHead className="w-[30px] text-center">
                 <input 
                   type="checkbox" 
                   className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                   checked={selectedIds.length > 0 && selectedIds.length === tickets.length}
                   onChange={onSelectAll}
                 />
              </TableHead>
              <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => onSort?.('status')}>
                <div className="flex items-center gap-1">Status {sortConfig?.field === 'status' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />}</div>
              </TableHead>
              <TableHead className="min-w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => onSort?.('clienteName')}>
                 <div className="flex items-center gap-1">Cliente {sortConfig?.field === 'clienteName' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />}</div>
              </TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status Coop.</TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => onSort?.('createdAt')}>
                 <div className="flex items-center gap-1">Data Criação {sortConfig?.field === 'createdAt' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => onSort?.('closedAt')}>
                 <div className="flex items-center gap-1">Fechamento {sortConfig?.field === 'closedAt' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />}</div>
              </TableHead>
              <TableHead>Atendente</TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => onSort?.('sla')}>
                 <div className="flex items-center gap-1">SLA {sortConfig?.field === 'sla' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />}</div>
              </TableHead>
              <TableHead>CSAT</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket, idx) => (
              <TableRow 
                key={ticket.id ?? ticket.protocol ?? `row-${idx}`} 
                className={cn(
                  "hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors",
                  selectedIds.includes(ticket.id) && "bg-indigo-50/50 dark:bg-indigo-900/10"
                )}
              >
                <TableCell className="text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.includes(ticket.id)}
                    onChange={() => onSelect?.(ticket.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-semibold w-fit whitespace-nowrap"
                      style={{ 
                        backgroundColor: ticket.statusColor ? `${ticket.statusColor}20` : '#e2e8f0', 
                        color: ticket.statusColor || '#64748b' 
                      }}
                    >
                      {ticket.statusName || ticket.status}
                    </span>
                    {ticket.criticityName && (
                       <span 
                         className="px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit"
                         style={{ borderColor: ticket.criticityColor, color: ticket.criticityColor }}
                       >
                         {ticket.criticityName}
                       </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{ticket.clienteName || ticket.externalName || "Desconhecido"}</span>
                    {ticket.clienteBirthDate && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.clienteBirthDate).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{ticket.contractName || "-"}</TableCell>
                <TableCell>

                  <div className="flex items-center gap-2">
                     {ticket.reasonName ? (
                        <Badge variant="secondary" className="font-normal text-xs whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none">
                          {ticket.reasonName}
                        </Badge>
                     ) : (
                        <span className="text-slate-400 text-xs">-</span>
                     )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                   {(() => {
                      const rawPhone = ticket.clientePhonePreferred || ticket.externalNumber || ticket.externalIdentifier;
                      if (!rawPhone) return "-";
                      const phone = rawPhone.replace('@c.us', '');
                      return (
                        <span className="font-mono text-slate-600 dark:text-slate-400">{phone}</span>
                      );
                   })()}
                </TableCell>
                <TableCell>
                  {getclienteStatusBadge(ticket.clienteStatus)}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(ticket.createdAt)}</span>
                    <span className="text-[10px] opacity-70">
                      via {ticket.channel === 'whatsapp' ? 'WhatsApp' : ticket.channel === 'email' ? 'E-mail' : 'Interno'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {ticket.closedAt ? formatDate(ticket.closedAt) : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {ticket.attendantNames ? (
                    <div className="flex flex-wrap gap-1">
                      {ticket.attendantNames.split(', ').map((name: string, i: number) => (
                        <span 
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                   {formatDurationFull(ticket.createdAt, ticket.closedAt)}
                </TableCell>
                <TableCell>
                   {ticket.csatRating ? (
                     <div className="flex items-center gap-1">
                       <span className="text-lg">
                        {ticket.csatRating === 3 ? '🤩' : ticket.csatRating === 2 ? '🙂' : '😡'}
                       </span>
                     </div>
                   ) : ticket.csatStatus === 'no_response' || !ticket.csatRating ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Hourglass className="w-4 h-4 text-slate-300" />
                          </TooltipTrigger>
                          <TooltipContent>Sem resposta</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                   ) : (
                     <span className="text-slate-400 text-xs">-</span>
                   )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onOpenChat(ticket)}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir Chat</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => onViewHistory(ticket)}>
                            <History className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Histórico</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => onViewCliente(ticket)}>
                            <User className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dados do Cliente</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Itens por página:</span>
            <select 
              className="h-8 w-16 rounded border border-slate-300 bg-white dark:bg-slate-950 dark:border-slate-700"
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Página {pagination.page}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={tickets.length < pagination.pageSize} // Simple check for next page availability
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



