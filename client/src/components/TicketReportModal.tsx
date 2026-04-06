import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Download, Mail, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TicketCriticitySelector } from "./TicketCriticitySelector";
import { TicketReasonSelector } from "./TicketReasonSelector";
import { TicketTypeSelector } from "./TicketTypeSelector";

interface TicketReportModalProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketReportModal({ ticketId, open, onOpenChange }: TicketReportModalProps) {
  const [email, setEmail] = useState("");
  const [whatsappTarget, setWhatsappTarget] = useState<"Cliente" | "coordenador" | "outro">("Cliente");
  const [customPhone, setCustomPhone] = useState("");
  
  const { data, isLoading } = trpc.tickets.getReportData.useQuery({ ticketId }, { enabled: open });
  
  const generatePdfMutation = trpc.tickets.generateReportPdf.useMutation({
    onSuccess: (responseData) => {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${responseData.pdfBase64}`;
      
      const protocol = data?.ticket.protocol || ticketId;
      const fullName = data?.Cliente?.name || data?.ticket.externalName || "Cliente";
      const nameParts = fullName.trim().split(/\s+/);
      const shortName = nameParts.length > 1 
        ? `${nameParts[0]}_${nameParts[nameParts.length - 1]}`
        : nameParts[0];
      
      const now = new Date();
      const dateTime = `${now.getDate().toString().padStart(2, '0')}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      
      link.download = `Relatorio_${protocol}-${shortName}-${dateTime}.pdf`;
      link.click();
      toast.success("PDF gerado com sucesso!");
    },
    onError: (error) => toast.error(`Erro ao gerar PDF: ${error.message}`)
  });

  const emailReportMutation = trpc.tickets.emailReport.useMutation({
    onSuccess: () => toast.success("Relatório enviado por e-mail!"),
    onError: (error) => toast.error(`Erro ao enviar e-mail: ${error.message}`)
  });

  const whatsappReportMutation = trpc.tickets.whatsappReport.useMutation({
    onSuccess: () => toast.success("Relatório enviado por WhatsApp!"),
    onError: (error) => toast.error(`Erro ao enviar WhatsApp: ${error.message}`)
  });

  const getTargetPhone = () => {
    if (whatsappTarget === "Cliente") return data?.Cliente?.whatsappNumber || data?.ticket.externalNumber || "";
    if (whatsappTarget === "coordenador") return data?.coordinatorPhone || "";
    return customPhone;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Relatório de Atendimento #{data?.ticket.protocol}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generatePdfMutation.mutate({ ticketId })}
                disabled={generatePdfMutation.isPending || isLoading}
              >
                {generatePdfMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                PDF
              </Button>
              <div className="flex items-center gap-1">
                  <Input 
                    placeholder="E-mail destinatário" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="h-8 w-80"
                  />
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => emailReportMutation.mutate({ ticketId, email })}
                   disabled={emailReportMutation.isPending || !email || isLoading}
                 >
                   {emailReportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                   Enviar
                 </Button>
              </div>

              <div className="flex items-center gap-1 ml-2 border-l pl-2">
                  <Select value={whatsappTarget} onValueChange={(v: any) => setWhatsappTarget(v)}>
                    <SelectTrigger className="h-8 w-44 text-xs px-2 uppercase font-semibold">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="outro">Número</SelectItem>
                    </SelectContent>
                  </Select>

                  {whatsappTarget === "outro" && (
                     <Input 
                       placeholder="Telefone com DDD" 
                       value={customPhone} 
                       onChange={(e) => setCustomPhone(e.target.value)} 
                       className="h-8 w-56 text-xs"
                     />
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => whatsappReportMutation.mutate({ ticketId, phone: getTargetPhone() })}
                    disabled={whatsappReportMutation.isPending || !getTargetPhone() || isLoading}
                  >
                    {whatsappReportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    WhatsApp
                  </Button>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
              <div>
                <span className="text-slate-500 block text-xs">Abertura</span>
                <span className="font-medium">{new Date(data.ticket.openedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Fechamento</span>
                <span className="font-medium">{data.ticket.closedAt ? new Date(data.ticket.closedAt).toLocaleString() : 'Em aberto'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">SLA Total</span>
                <span className="font-medium text-blue-600">{data.metrics.totalTime}</span>
              </div>
              <div>
                 <span className="text-slate-500 block text-xs">Status</span>
                 {/* Badge estilizado conforme solicitado */}
                 <span 
                   className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                     data.ticket.status === 'atendimento_fechado' 
                       ? 'bg-green-500 text-white border-transparent' 
                       : 'bg-slate-100 text-slate-600 border-slate-200'
                   }`}
                 >
                   {data.ticket.status.replace(/_/g, " ")}
                 </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Cliente */}
               <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Cliente</CardTitle></CardHeader>
                 <CardContent className="text-sm space-y-2">
                   <div className="flex justify-between"><span>Nome:</span> <span className="font-medium">{data.Cliente?.name || data.ticket.externalName}</span></div>
                   <div className="flex justify-between"><span>Matrícula:</span> <span className="font-medium">{data.Cliente?.registrationNumber || "-"}</span></div>
                   <div className="flex justify-between"><span>E-mail:</span> <span className="font-medium">{data.Cliente?.email || "-"}</span></div>
                   <div className="flex justify-between"><span>Telefone:</span> <span className="font-medium">{data.Cliente?.whatsappNumber || data.ticket.externalNumber}</span></div>
                   
                   {/* Novos Campos Solicitados */}
                   <div className="flex justify-between">
                     <span>Contrato:</span> 
                     <span className="font-medium">{data.Cliente?.contractName || "Não informado"}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Coordenador:</span> 
                     <span className="font-medium">{data.Cliente?.coordinatorName || "-"}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Status:</span> 
                     <span className={`font-medium lowercase first-letter:uppercase ${data.Cliente?.status === 'ativo' ? 'text-green-600' : 'text-slate-600'}`}>
                        {data.Cliente?.status || "-"}
                     </span>
                   </div>

                 </CardContent>
               </Card>

               {/* Resumo Ticket */}
               <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Resumo Ticket</CardTitle></CardHeader>
                 <CardContent className="text-sm space-y-2">
                   <div className="flex justify-between items-center">
                     <span>Motivo:</span> 
                     <div className="pointer-events-none">
                       <TicketReasonSelector ticket={data.ticket} />
                     </div>
                   </div>
                   <div className="flex justify-between items-center">
                     <span>Tipo:</span> 
                     <div className="pointer-events-none">
                       <TicketTypeSelector ticket={data.ticket} />
                     </div>
                   </div>
                   <div className="flex justify-between items-center">
                     <span>Prioridade:</span> 
                     <div className="pointer-events-none">
                       <TicketCriticitySelector ticket={data.ticket} />
                     </div>
                   </div>
                   <div className="flex justify-between"><span>Canal:</span> <span className="font-medium uppercase">{data.ticket.channel}</span></div>
                   <div className="flex justify-between">
                      <span>Atendente:</span> 
                      <span className="font-medium text-right max-w-[200px] truncate" title={data.ticket.participatingAttendants}>
                        {data.ticket.participatingAttendants || "-"}
                      </span>
                   </div>
                   {data.csat && (data.csat.rating || data.csat.status === "expired") && (
                     <div className="flex justify-between items-center bg-slate-50 p-1.5 -mx-1.5 rounded">
                       <span>Avaliação do Atendimento:</span>
                       <span className={`font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${
                          data.csat.rating === 3 ? "bg-green-100 text-green-700 border-green-200" :
                          data.csat.rating === 2 ? "bg-amber-100 text-amber-700 border-amber-200" :
                          data.csat.rating === 1 ? "bg-red-100 text-red-700 border-red-200" :
                          "bg-slate-100 text-slate-500 border-slate-200"
                       }`}>
                          {data.csat.rating === 3 ? "🤩 Excelente" : 
                           data.csat.rating === 2 ? "🙂 Bom" : 
                           data.csat.rating === 1 ? "😡 Ruim" : "⏳ Sem Resposta"}
                       </span>
                     </div>
                   )}
                 </CardContent>
               </Card>
            </div>

            {/* Histórico */}
            <Tabs defaultValue="main">
               <TabsList>
                 <TabsTrigger value="main">Chat Principal ({data.history.main.length})</TabsTrigger>
                 <TabsTrigger value="internal">Interno ({data.history.internal.length})</TabsTrigger>
                 <TabsTrigger value="coordinator">Coordenador ({data.history.coordinator.length})</TabsTrigger>
               </TabsList>
               <TabsContent value="main" className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                 {data.history.main.map((msg: any) => (
                    <div key={msg.id} className="mb-4 text-sm border-b pb-2">
                       <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="font-bold uppercase">
                             {msg.senderType === 'Cliente' ? 'Cliente' : 'Atendente'}
                             <span className="font-normal text-slate-400 capitalize ml-1">: {msg.senderName}</span>
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                       </div>
                       <p>{msg.message}</p>
                    </div>
                 ))}
                 {data.history.main.length === 0 && <p className="text-slate-400 text-center">Nenhuma mensagem.</p>}
               </TabsContent>
               <TabsContent value="internal" className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                 {data.history.internal.map((msg: any) => (
                    <div key={msg.id} className="mb-4 text-sm border-b pb-2 bg-yellow-50/50 p-2 rounded">
                       <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="font-bold uppercase">
                             {msg.senderName}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                       </div>
                       <p>{msg.message}</p>
                    </div>
                 ))}
                 {data.history.internal.length === 0 && <p className="text-slate-400 text-center">Nenhuma mensagem.</p>}
               </TabsContent>
               <TabsContent value="coordinator" className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                 {data.history.coordinator.map((msg: any) => (
                    <div key={msg.id} className="mb-4 text-sm border-b pb-2 bg-purple-50/50 p-2 rounded">
                       <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="font-bold uppercase">
                             {msg.senderType === 'Cliente' ? 'Coordenador' : 'Atendente'}
                             <span className="font-normal text-slate-600 capitalize ml-1">: {msg.senderName}</span>
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                       </div>
                       <p>{msg.message}</p>
                    </div>
                 ))}
                 {data.history.coordinator.length === 0 && <p className="text-slate-400 text-center">Nenhuma mensagem.</p>}
               </TabsContent>
            </Tabs>

          </div>
        ) : (
          <div className="text-center text-red-500">Erro ao carregar dados.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}



