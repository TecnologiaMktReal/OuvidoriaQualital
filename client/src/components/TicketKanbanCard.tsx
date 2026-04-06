import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TicketReasonSelector } from "@/components/TicketReasonSelector";
import { TicketCriticitySelector } from "@/components/TicketCriticitySelector";
import { TicketTypeSelector } from "@/components/TicketTypeSelector";
import { Clock, History, Mail, MessageCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Função local (mantém a mesma lógica usada em Tickets.tsx)
function formatWhatsAppId(id?: string | null) {
  if (!id) return "";
  const digits = id.split("@")[0].replace(/\D/g, "");

  if (digits.length >= 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const first = digits.slice(4, -4);
    const last = digits.slice(-4);
    return `(${ddd}) ${first}-${last}`;
  }
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const first = digits.slice(2, -4);
    const last = digits.slice(-4);
    return `(${ddd}) ${first}-${last}`;
  }

  return digits || id;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDurationFull(start?: string | Date | null, end?: string | Date | null) {
  if (!start) return "-";
  const startDate = new Date(start).getTime();
  const endDate = end ? new Date(end).getTime() : Date.now();
  const diff = endDate - startDate;
  if (diff < 0) return "00:00:00";

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function TicketKanbanCard({
  ticket,
  onOpenChat,
  onViewHistory,
  onViewCliente,
}: {
  ticket: any;
  onOpenChat: (ticket: any) => void;
  onViewHistory: (ticket: any) => void;
  onViewCliente: (ticket: any) => void;
}) {
  const displayName =
    ticket.clienteName ||
    formatWhatsAppId((ticket as any).externalNumber || ticket.externalIdentifier) ||
    "Não Cliente";

  const statusLabel =
    ticket.status === "em_espera" && ticket.departmentName
      ? `Em Espera + ${ticket.departmentName}`
      : ticket.statusName || String(ticket.status || "").replace(/_/g, " ");

  return (
    <Card
      onClick={() => onOpenChat(ticket)}
      className={cn(
        "group relative cursor-pointer transition-all duration-200 active:scale-[0.99]",
        "border-slate-200/90 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/40 shadow-sm hover:shadow-md",
        "hover:border-indigo-300/80 dark:hover:border-indigo-600/40"
      )}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600">#{ticket.protocol}</span>
            {ticket.channel === "whatsapp" && (
              <MessageCircle size={14} className="text-green-500 fill-green-500/10" />
            )}
            {ticket.channel === "email" && <Mail size={14} className="text-blue-500 fill-blue-500/10" />}
          </div>

          <div className="flex items-center gap-1.5">
          {ticket.csatRating && (
            <span
              className="text-[10px] font-bold bg-white dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200/90 dark:border-slate-700/70 flex items-center gap-1 shadow-sm"
              title={`Avaliação: ${ticket.csatRating === 3 ? "Excelente" : ticket.csatRating === 2 ? "Bom" : "Ruim"}`}
            >
              <span>{ticket.csatRating === 3 ? "🤩" : ticket.csatRating === 2 ? "🙂" : "😡"}</span>
              <span
                className={cn(
                  ticket.csatRating === 3
                    ? "text-green-600"
                    : ticket.csatRating === 2
                      ? "text-amber-600"
                      : "text-red-600"
                )}
              >
                {ticket.csatRating === 3 ? "Excelente" : ticket.csatRating === 2 ? "Bom" : "Ruim"}
              </span>
            </span>
          )}

          {ticket.csatStatus === "expired" && (
            <span className="text-xs text-slate-300 cursor-help" title="Pesquisa expirada (sem resposta)">
              ⏳
            </span>
          )}

          <span
            className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border shadow-sm"
            style={{
              backgroundColor: ticket.statusColor || "#f1f5f9",
              color: ticket.statusColor ? "#fff" : "#475569",
              borderColor: ticket.statusColor ? "transparent" : "#cbd5e1",
            }}
          >
            {statusLabel}
          </span>
          </div>
        </div>

        <div className="mb-2">
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{displayName}</div>
          <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 overflow-hidden">
            <span className="truncate flex items-center gap-1.5">
              {ticket.clienteId ? (
                <>
                  <span>{ticket.contractName || "Contrato não informado"}</span>
                  {ticket.clientePosition && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{ticket.clientePosition}</span>
                    </>
                  )}
                  {ticket.clienteStatus && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span
                        className={cn(
                          "font-semibold lowercase first-letter:uppercase",
                          ticket.clienteStatus === "ativo" ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {ticket.clienteStatus}
                      </span>
                    </>
                  )}
                </>
              ) : (
                ticket.externalName || "Não Cliente"
              )}
            </span>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <TicketReasonSelector ticket={ticket} />
          <TicketTypeSelector ticket={ticket} />
          <TicketCriticitySelector ticket={ticket} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <Clock size={12} />
            <span>{formatDate(ticket.openedAt || ticket.createdAt)}</span>
            {ticket.status === "atendimento_fechado" ? (
              <span className="text-slate-600 dark:text-slate-300 font-semibold ml-2">
                {formatDurationFull(ticket.createdAt || ticket.openedAt, ticket.closedAt)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {ticket.status !== "atendimento_fechado" && (
              <span className="relative flex h-2 w-2 mr-1.5" title="Atividade recente">
                {ticket.lastMessageSenderType === "Cliente" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                )}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Histórico"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(ticket);
              }}
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Dados do Cliente"
              onClick={(e) => {
                e.stopPropagation();
                onViewCliente(ticket);
              }}
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




