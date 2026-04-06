import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";

interface DeclarationPreviewModalProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: string; // "whatsapp" | "email"
}

export function DeclarationPreviewModal({ ticketId, open, onOpenChange, channel }: DeclarationPreviewModalProps) {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const generatePdfMutation = trpc.tickets.generateDeclarationPdf.useMutation({
    onSuccess: (data) => {
      setPdfBase64(data.pdfBase64);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar declaração: ${error.message}`);
      onOpenChange(false);
    }
  });

  const sendMutation = trpc.tickets.sendDeclaration.useMutation({
    onSuccess: () => {
      toast.success("Declaração enviada com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar declaração: ${error.message}`);
    }
  });

  useEffect(() => {
    if (open) {
      setPdfBase64(null);
      generatePdfMutation.mutate({ ticketId });
    }
  }, [open, ticketId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Pré-visualização da Declaração</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden">
          {generatePdfMutation.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500 font-medium">Gerando PDF...</p>
            </div>
          ) : pdfBase64 ? (
            <iframe 
              src={`data:application/pdf;base64,${pdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-none"
              title="Declaration Preview"
            />
          ) : (
            <p className="text-slate-400">Nenhum PDF gerado.</p>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-white flex justify-between sm:justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sendMutation.isPending}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="default" 
              className={channel === 'whatsapp' ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
              onClick={() => {
                if (pdfBase64) {
                  sendMutation.mutate({ 
                    ticketId, 
                    pdfBase64, 
                    channel: channel as any 
                  });
                }
              }}
              disabled={!pdfBase64 || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : channel === 'whatsapp' ? (
                <MessageSquare className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar por {channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



