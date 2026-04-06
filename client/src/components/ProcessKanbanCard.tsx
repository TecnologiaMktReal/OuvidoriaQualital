import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserCircle, 
  ShieldAlert, 
  FileText, 
  Clock, 
  Workflow,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface ProcessKanbanCardProps {
  process: any;
  onClick: (id: number) => void;
  isDragging?: boolean;
}

export function ProcessKanbanCard({ process, onClick, isDragging }: ProcessKanbanCardProps) {
  const createdAt = new Date(process.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        onClick={() => onClick(process.id)}
        className={cn(
          "group relative cursor-pointer overflow-hidden transition-all duration-300",
          "border-slate-200/60 dark:border-slate-800/60",
          "bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl",
          "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]",
          "hover:border-blue-400/50 dark:hover:border-blue-500/30 hover:-translate-y-0.5",
          isDragging ? "shadow-2xl border-blue-500/50 scale-[1.02] rotate-[1deg] z-50" : "shadow-sm"
        )}
      >
        {/* Accent Bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
          process.isAnonymous ? "bg-amber-500/80" : "bg-blue-600/80",
          "group-hover:w-1.5"
        )} />

        <CardContent className="p-4 pl-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {process.isAnonymous ? (
                  <Badge 
                    variant="outline" 
                    className="animate-in fade-in zoom-in duration-500 text-[10px] font-bold text-amber-600 border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800/30 gap-1 rounded-full px-2 py-0"
                  >
                    <ShieldAlert className="w-3 h-3"/> SIGILOSO
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[13px] tracking-tight truncate max-w-[180px]">
                    <div className="p-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                       <UserCircle className="w-3.5 h-3.5" />
                    </div>
                    {process.clienteName || "Sem Nome"}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold tracking-tighter border border-slate-200/30 dark:border-slate-700/30">
                #{process.id}
              </span>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-2 px-0.5 mb-4 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {process.reason || "Motivo não especificado"}
          </p>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100/80 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              {process.sourceTicketProtocol ? (
                <div className="group/protocol flex items-center gap-1 text-[10px] font-bold text-blue-600/80 dark:text-blue-400/80 bg-blue-50/30 dark:bg-blue-900/10 px-2 py-0.5 rounded-md border border-blue-100/50 dark:border-blue-800/30 transition-all hover:bg-blue-100/50">
                  <FileText className="w-3 h-3 opacity-70" />
                  <span>TKT-{process.sourceTicketProtocol}</span>
                  <ChevronRight className="w-2.5 h-2.5 opacity-0 -ml-1 group-hover/protocol:opacity-100 group-hover/protocol:ml-0 transition-all" />
                </div>
              ) : (
                <div className="flex items-center text-[10px] text-slate-400 font-bold tracking-tight uppercase">
                  <Workflow className="w-3 h-3 mr-1 opacity-50" /> Avulso
                </div>
              )}
            </div>
            
            <div className="flex items-center text-[10px] font-bold text-slate-500/80 dark:text-slate-400/80 bg-slate-100/60 dark:bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-200/40 dark:border-slate-700/30">
              <Clock className="w-3 h-3 mr-1.5 opacity-60" />
              {format(createdAt, "dd MMM", { locale: ptBR })}
            </div>
          </div>
        </CardContent>
        
        {/* Hover Highlight Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>
    </motion.div>
  );
}



