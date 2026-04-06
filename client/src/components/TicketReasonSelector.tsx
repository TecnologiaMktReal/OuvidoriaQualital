
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ChevronDown, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SimpleTicket {
  id: number;
  reasonId?: number | null;
  reasonName?: string | null;
  reasonColor?: string | null;
}

export function TicketReasonSelector({ ticket }: { ticket: SimpleTicket }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const ctx = trpc.useContext();
  const { data: reasons } = trpc.attendanceReasons.list.useQuery();
  
  const updateDetails = trpc.tickets.updateDetails.useMutation({
    onSuccess: () => {
      ctx.tickets.list.invalidate();
    }
  });

  const currentReason = reasons?.find(r => r.id === ticket.reasonId);
  // Fallback visual properties
  const bgColor = currentReason?.color || "#f1f5f9"; // slate-100
  const textColor = currentReason?.color ? "#fff" : "#64748b"; // slate-500
  const borderColor = currentReason?.color ? "transparent" : "#e2e8f0"; // slate-200

  const handleSelect = (reasonId: number | undefined) => {
    updateDetails.mutate({ id: ticket.id, reasonId });
    setOpen(false);
    setSearch("");
  };

  const filteredReasons = reasons
    ?.filter(r => !["Atendimento WhatsApp", "Atendimento por E-mail"].includes(r.name))
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={updateDetails.isPending}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border transition-all hover:opacity-90 active:scale-95 min-w-0 max-w-[140px]",
            updateDetails.isPending && "opacity-50 cursor-not-allowed"
          )}
          style={{
            backgroundColor: bgColor,
            color: textColor,
            borderColor: borderColor,
          }}
        >
          {updateDetails.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="truncate block">
              {currentReason?.name || "Sem Motivo"}
            </span>
          )}
          <ChevronDown size={10} className="opacity-70 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-white rounded-xl shadow-xl border-slate-100" align="start" side="bottom">
        <div className="space-y-2">
          <Input
            placeholder="Buscar motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-indigo-500/20"
            autoFocus
          />
          
          <div className="max-h-[240px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-1">
             <button
              onClick={() => handleSelect(undefined)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors" />
              <span>Sem Motivo</span>
            </button>

            {filteredReasons?.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleSelect(reason.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group"
              >
                <div 
                  className="w-2 h-2 rounded-full border border-white/40 shadow-sm shrink-0" 
                  style={{ backgroundColor: reason.color || '#cbd5e1' }}
                />
                <span className="truncate flex-1">{reason.name}</span>
              </button>
            ))}

            {filteredReasons?.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-4 italic">
                Nenhum motivo encontrado
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}



