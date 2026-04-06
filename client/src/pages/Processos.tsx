import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Layout } from "@/components/Layout";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Clock, FileText, UserCircle, ShieldAlert, Workflow, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessKanbanCard } from "@/components/ProcessKanbanCard";

type ProcessStage = 
  | "Analise da Ouvidoria"
  | "Solicitação de Informações"
  | "Conselho Administrativo"
  | "Resultado do Processo";

const STAGES: ProcessStage[] = [
  "Analise da Ouvidoria",
  "Solicitação de Informações",
  "Conselho Administrativo",
  "Resultado do Processo",
];

export default function Processos() {
  const queryClient = useQueryClient();
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries e Mutations
  const { data: processes = [], isLoading } = trpc.processes.listBoard.useQuery();
  const updateStageMut = trpc.processes.updateStage.useMutation({
    onSuccess: () => {
      trpc.useContext().processes.listBoard.invalidate();
    },
    onError: () => {
      toast.error("Erro ao mover processo");
      trpc.useContext().processes.listBoard.invalidate(); // reverte estado local
    }
  });

  // Agrupa os processos por stage
  const columns = useMemo(() => {
    const cols: Record<ProcessStage, typeof processes> = {
      "Analise da Ouvidoria": [],
      "Solicitação de Informações": [],
      "Conselho Administrativo": [],
      "Resultado do Processo": [],
    };
    processes.forEach(p => {
      if (cols[p.stage as ProcessStage]) {
        cols[p.stage as ProcessStage].push(p);
      }
    });
    return cols;
  }, [processes]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return; // não mudou nada
    }

    const processId = parseInt(draggableId, 10);
    const newStage = destination.droppableId as ProcessStage;

    // Mutate otimista opcional, mas vamos só chamar
    updateStageMut.mutate({ id: processId, stage: newStage });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex w-full min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // Cores dinâmicas para as colunas do Kanban
  const stageStyles: Record<ProcessStage, { bg: string; text: string; indicator: string }> = {
    "Analise da Ouvidoria": { bg: "bg-blue-500/5", text: "text-blue-600 dark:text-blue-400", indicator: "bg-blue-600" },
    "Solicitação de Informações": { bg: "bg-amber-500/5", text: "text-amber-600 dark:text-amber-400", indicator: "bg-amber-500" },
    "Conselho Administrativo": { bg: "bg-indigo-500/5", text: "text-indigo-600 dark:text-indigo-400", indicator: "bg-indigo-600" },
    "Resultado do Processo": { bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", indicator: "bg-emerald-500" },
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col px-4 md:px-[6%] xl:px-[8%] py-8 relative">
        {/* Modern Mesh Gradient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-400/5 blur-[100px]" />
          <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-slate-400/5 blur-[150px]" />
        </div>

        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-3xl bg-blue-600 shadow-2xl shadow-blue-500/20 text-white">
              <LayoutDashboard size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.2em] mb-1">
                Workflow Orchestrator
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                Câmara de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Processos</span>
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-3 font-medium max-w-xl">
                Gestão ágil e transparente de fluxos administrativos, apurações e resoluções institucionais.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pb-1">
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="px-8 py-6 h-auto text-base font-bold gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95 transition-all rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-white/5 border-none"
            >
              <Plus className="h-5 w-5" strokeWidth={3} />
              Novo Processo
            </Button>
          </div>
        </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4 px-2 select-none snap-x scroll-smooth">
          {STAGES.map((stage) => {
            const config = stageStyles[stage];
            const stageProcesses = columns[stage];
            
            return (
              <div 
                key={stage} 
                className={cn(
                  "flex-shrink-0 w-[350px] flex flex-col rounded-[2.5rem] border transition-all duration-500",
                  "bg-slate-100/30 dark:bg-slate-900/10 backdrop-blur-3xl shadow-2xl shadow-indigo-500/5",
                  "border-slate-200/50 dark:border-slate-800/40",
                  config.bg
                )}
              >
                <div className="p-6 pb-2 rounded-t-[2.5rem] relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5 opacity-60", config.indicator)} />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <h3 className={cn("font-black text-xs uppercase tracking-[0.15em] mb-1.5", config.text)}>
                        {stage}
                      </h3>
                      <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", config.indicator)} />
                         <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Status do Fluxo</span>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white font-black px-4 py-1.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-inner text-sm min-w-[3rem] text-center">
                      {stageProcesses.length}
                    </div>
                  </div>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 p-5 overflow-y-auto min-h-[150px] transition-colors duration-500 rounded-b-[2.5rem] scrollbar-hide",
                        snapshot.isDraggingOver ? "bg-white/40 dark:bg-white/5 ring-2 ring-indigo-400/20 ring-inset" : "bg-transparent"
                      )}
                    >
                      <div className="flex flex-col gap-4">
                        {stageProcesses.map((process, index) => (
                          <Draggable
                            key={process.id}
                            draggableId={process.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="group/draggable"
                              >
                                <ProcessKanbanCard 
                                  process={process} 
                                  onClick={setSelectedProcessId}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {stageProcesses.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-full flex flex-col items-center justify-center py-12 opacity-30 select-none grayscale contrast-75">
                           <LayoutDashboard className="w-12 h-12 mb-3 text-slate-400" />
                           <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Sem processos</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Editor Modal/Sheet */}
      {selectedProcessId && (
        <ProcessEditorSheet 
          processId={selectedProcessId} 
          onClose={() => setSelectedProcessId(null)} 
        />
      )}

      {/* Create Manual Modal/Sheet */}
      {isCreateModalOpen && (
        <ProcessCreatorModal
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
      </div>
    </Layout>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES PARA MANTER O PRINCIPAL LIMPO
// ============================================================================

function ProcessEditorSheet({ processId, onClose }: { processId: number, onClose: () => void }) {
  const { data: process, isLoading } = trpc.processes.getById.useQuery({ id: processId });
  const updateFields = trpc.processes.updateFields.useMutation({
    onSuccess: () => {
      toast.success("Campos atualizados");
      trpc.useContext().processes.listBoard.invalidate();
    }
  });

  if (isLoading || !process) return null;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateFields.mutate({
      id: processId,
      ouvidorAnalysis: formData.get("ouvidorAnalysis") as string,
      councilAnalysis: formData.get("councilAnalysis") as string,
      finalAnalysis: formData.get("finalAnalysis") as string,
      appliedSolution: formData.get("appliedSolution") as string,
    });
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6 border-b pb-4">
          <SheetTitle>Detalhes do Processo #{process.id}</SheetTitle>
          <SheetDescription>
            Origem: {process.sourceTicketId ? `Ticket Vinculado` : 'Inserção Manual'} ({format(new Date(process.createdAt), "dd/MM/yyyy HH:mm")})
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                <UserCircle className="w-4 h-4" /> 
                Dados do Solicitante
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {process.isAnonymous ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                  <ShieldAlert className="w-4 h-4" /> Processo Sigiloso / Anônimo
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-slate-500 block text-xs mb-1">Nome</span>{process.clienteName || "-"}</div>
                  <div><span className="text-slate-500 block text-xs mb-1">CPF</span>{process.ClienteCpf || "-"}</div>
                  <div><span className="text-slate-500 block text-xs mb-1">Telefone</span>{process.clientePhone || "-"}</div>
                  <div><span className="text-slate-500 block text-xs mb-1">Email</span>{process.clienteEmail || "-"}</div>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-xs mb-1">Motivo / Assunto</span>
                <p className="font-medium">{process.reason || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>Análise do Ouvidor</Label>
              <Textarea 
                name="ouvidorAnalysis" 
                defaultValue={process.ouvidorAnalysis || ""} 
                placeholder="Parecer inicial da ouvidoria..." 
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Análise do Conselho</Label>
              <Textarea 
                name="councilAnalysis" 
                defaultValue={process.councilAnalysis || ""} 
                placeholder="Considerações do conselho administrativo..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Análise Final</Label>
              <Textarea 
                name="finalAnalysis" 
                defaultValue={process.finalAnalysis || ""} 
                placeholder="Conclusão e encerramento da apuração..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Solução Aplicada</Label>
              <Textarea 
                name="appliedSolution" 
                defaultValue={process.appliedSolution || ""} 
                placeholder="Ação punitiva, corretiva ou de melhoria..."
                className="min-h-[100px]"
              />
            </div>

            <div className="pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white p-4 -mx-6 -mb-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={updateFields.isPending}>
                {updateFields.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProcessCreatorModal({ onClose }: { onClose: () => void }) {
  const [isAnon, setIsAnon] = useState(false);
  
  const createMut = trpc.processes.createManual.useMutation({
    onSuccess: () => {
      toast.success("Processo inserido com sucesso!");
      trpc.useContext().processes.listBoard.invalidate();
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMut.mutate({
      isAnonymous: isAnon,
      clienteName: isAnon ? "" : formData.get("name") as string,
      ClienteCpf: isAnon ? "" : formData.get("cpf") as string,
      clientePhone: isAnon ? "" : formData.get("phone") as string,
      clienteEmail: isAnon ? "" : formData.get("email") as string,
      reason: formData.get("reason") as string,
      description: formData.get("description") as string,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl p-0 gap-0">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 px-8 text-white">
          <DialogTitle className="text-2xl font-black mb-1 flex items-center gap-2">
            <Workflow className="w-6 h-6 opacity-80" />
            Novo Card de Processo
          </DialogTitle>
          <DialogDescription className="text-blue-100 font-medium">
            Inicie um acompanhamento administrativo de forma manual na Câmara de Processos.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-slate-50/50 dark:bg-transparent">
          <div className="space-y-4">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Natureza da Abertura</Label>
            <RadioGroup defaultValue="identificado" onValueChange={(val) => setIsAnon(val === "anonimo")} className="flex gap-4">
              <Label 
                htmlFor="r1" 
                className={cn(
                  "flex-1 flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all border-2",
                  !isAnon 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-100" 
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <RadioGroupItem value="identificado" id="r1" className="sr-only" />
                <UserCircle className="w-5 h-5 mr-2 opacity-80" />
                <span>Identificado publicamente</span>
              </Label>
              <Label 
                htmlFor="r2" 
                className={cn(
                  "flex-1 flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all border-2",
                  isAnon 
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-100" 
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <RadioGroupItem value="anonimo" id="r2" className="sr-only" />
                <ShieldAlert className="w-5 h-5 mr-2 opacity-80" />
                <span>Sigiloso / Anônimo</span>
              </Label>
            </RadioGroup>
          </div>

          <div className={cn("transition-all duration-300 overflow-hidden", isAnon ? "h-0 opacity-0" : "h-auto opacity-100")}>
            <div className="grid grid-cols-2 gap-5 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label className="font-semibold text-slate-600">Nome Completo</Label>
                <Input name="name" className="bg-slate-50 dark:bg-slate-900" placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label className="font-semibold text-slate-600">Documento (CPF/CNPJ)</Label>
                <Input name="cpf" className="bg-slate-50 dark:bg-slate-900" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label className="font-semibold text-slate-600">Celular de Contato</Label>
                <Input name="phone" className="bg-slate-50 dark:bg-slate-900" placeholder="(11) 90000-0000" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label className="font-semibold text-slate-600">E-mail</Label>
                <Input name="email" type="email" className="bg-slate-50 dark:bg-slate-900" placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 text-base">Assunto do Processo</Label>
              <Input name="reason" placeholder="Qual o cerne desta apuração? (Ex: Denúncia Falsidade Ideológica)" required className="font-medium text-lg h-12" />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Relato dos Fatos / Descrição</Label>
              <Textarea 
                name="description" 
                placeholder="Descreva minuciosamente todos os fatos, datas e suspeitas desta apuração..." 
                required
                className="min-h-[160px] resize-none text-base"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 mt-8">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending} className="rounded-xl px-8 bg-blue-600 hover:bg-blue-700 shadow-md">
              {createMut.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
              Gerar Processo no Kanban
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



