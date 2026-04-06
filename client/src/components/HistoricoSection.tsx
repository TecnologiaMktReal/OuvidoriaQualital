import React from "react";
import { History, Clock, User as UserIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface HistoricoSectionProps {
  ticketId: number;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatTime(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function HistoricoSection({ ticketId }: HistoricoSectionProps) {
  // Buscar mensagens do ticket como histórico
  const { data: messages } = trpc.tickets.messages.list.useQuery(
    { ticketId },
    { enabled: !!ticketId }
  );

  const historyItems = (messages as any[] | undefined)?.slice(0, 10) || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 border-b border-violet-100 dark:border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-300 flex items-center gap-2">
          <History size={16} className="text-violet-600 dark:text-violet-400" />
          Histórico de Interações
        </h3>
        <span className="text-xs font-medium text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
          {historyItems.length}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="max-h-[300px] overflow-y-auto">
        {historyItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <History size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">Nenhum histórico encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {historyItems.map((item: any, index: number) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {item.senderType === "Cliente" ? "Cliente" : `Atendente ${item.senderName || ""}`}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[10px] text-slate-500">
                          {formatDate(item.createdAt)} às {formatTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    item.senderType === "Cliente"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                  }`}>
                    {item.senderType === "Cliente" ? "Entrada" : "Saída"}
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 group-hover:line-clamp-none transition-all">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



