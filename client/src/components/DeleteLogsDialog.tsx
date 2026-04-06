import React, { useState } from "react";
import { format, subDays } from "date-fns";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface DeleteLogsDialogProps {
  type: "audit" | "whatsapp";
  onSuccess?: () => void;
}

export function DeleteLogsDialog({ type, onSuccess }: DeleteLogsDialogProps) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isOpen, setIsOpen] = useState(false);

  const clearAudit = trpc.audit.clear.useMutation({
    onSuccess: () => {
      toast.success("Logs de auditoria removidos com sucesso!");
      onSuccess?.();
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Falha ao remover logs: ${err.message}`);
    }
  });

  const clearWhatsapp = trpc.whatsapp.clearCommunicationLogs.useMutation({
    onSuccess: () => {
      toast.success("Logs de comunicação removidos com sucesso!");
      onSuccess?.();
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Falha ao remover logs: ${err.message}`);
    }
  });

  const isLoading = clearAudit.isPending || clearWhatsapp.isPending;

  const handleClear = async () => {
    if (!dateFrom || !dateTo) return;
    
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    if (type === "audit") {
      await clearAudit.mutateAsync({ dateFrom: from, dateTo: to });
    } else {
      await clearWhatsapp.mutateAsync({ dateFrom: from, dateTo: to });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
          <Trash2 className="mr-2 h-4 w-4" />
          Limpar Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Limpar Histórico de Logs
          </DialogTitle>
          <DialogDescription>
            Selecione o período abaixo. Esta ação é irreversível e removerá permanentemente os registros do banco de dados selecionados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="from" className="text-right">Início</Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="to" className="text-right">Fim</Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
             <Button variant="ghost" disabled={isLoading}>Cancelar</Button>
          </DialogClose>
          <Button 
            variant="destructive" 
            onClick={handleClear} 
            disabled={isLoading || !dateFrom || !dateTo}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



