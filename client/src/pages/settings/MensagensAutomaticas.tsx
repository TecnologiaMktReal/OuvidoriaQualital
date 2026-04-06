import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Trash2, Bot, Info, Pencil, Search, Save, X, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function MensagensAutomaticas() {
  // Query
  const { data: quickMessages, refetch: refetchQuickMessages, isLoading } = trpc.quickMessages.list.useQuery();

  // State for Quick Messages Modal
  const [isQuickMsgModalOpen, setIsQuickMsgModalOpen] = useState(false);
  const [editingQuickMsgId, setEditingQuickMsgId] = useState<number | null>(null);
  const [quickMessageTitle, setQuickMessageTitle] = useState("");
  const [quickMessageContent, setQuickMessageContent] = useState("");
  const [quickMessageCategory, setQuickMessageCategory] = useState("");

  // State for BOT Messages Modal
  const [isBotMsgModalOpen, setIsBotMsgModalOpen] = useState(false);
  const [editingBotMsgId, setEditingBotMsgId] = useState<number | null>(null);
  const [botCategory, setBotCategory] = useState<string>("boas_vindas");
  const [botContent, setBotContent] = useState("");
  const [botTimeout, setBotTimeout] = useState<string>("");
  const [botTimeoutSeconds, setBotTimeoutSeconds] = useState<string>("");

  // Mutations
  const createQuickMessageMutation = trpc.quickMessages.create.useMutation({
    onSuccess: () => {
      toast.success("Mensagem salva com sucesso!");
      closeQuickMsgModal();
      refetchQuickMessages();
    },
    onError: (error) => toast.error(`Erro ao salvar: ${error.message}`),
  });

  const updateQuickMessageMutation = trpc.quickMessages.update.useMutation({
    onSuccess: () => {
      toast.success("Mensagem atualizada com sucesso!");
      closeQuickMsgModal();
      refetchQuickMessages();
    },
    onError: (error) => toast.error(`Erro ao atualizar: ${error.message}`),
  });

  const deleteQuickMessageMutation = trpc.quickMessages.delete.useMutation({
    onSuccess: () => {
      toast.success("Mensagem excluída!");
      refetchQuickMessages();
    },
    onError: (error) => toast.error(`Erro ao excluir: ${error.message}`),
  });

  // Handlers for Quick Messages
  const openCreateQuickMsg = () => {
    setEditingQuickMsgId(null);
    setQuickMessageTitle("");
    setQuickMessageContent("");
    setQuickMessageCategory("");
    setIsQuickMsgModalOpen(true);
  };

  const openEditQuickMsg = (msg: any) => {
    setEditingQuickMsgId(msg.id);
    setQuickMessageTitle(msg.title);
    setQuickMessageContent(msg.content);
    setQuickMessageCategory(msg.category || "");
    setIsQuickMsgModalOpen(true);
  };

  const closeQuickMsgModal = () => {
    setIsQuickMsgModalOpen(false);
    setEditingQuickMsgId(null);
  };

  const handleSaveQuickMessage = () => {
    if (!quickMessageTitle || !quickMessageContent) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    if (editingQuickMsgId) {
      updateQuickMessageMutation.mutate({
        id: editingQuickMsgId,
        title: quickMessageTitle,
        content: quickMessageContent,
        category: quickMessageCategory || undefined,
      });
    } else {
      createQuickMessageMutation.mutate({
        title: quickMessageTitle,
        content: quickMessageContent,
        category: quickMessageCategory || undefined,
      });
    }
  };

  // Handlers for BOT Messages
  const openCreateBotMsg = () => {
    setEditingBotMsgId(null);
    setBotCategory("boas_vindas");
    setBotContent("");
    setBotTimeout("");
    setBotTimeoutSeconds("");
    setIsBotMsgModalOpen(true);
  };

  const openEditBotMsg = (msg: any) => {
    setEditingBotMsgId(msg.id);
    const categoryType = msg.category.replace("BOT-", "");
    setBotCategory(categoryType);
    setBotContent(msg.content);
    setBotTimeout(msg.timeoutMinutes ? String(msg.timeoutMinutes) : "");
    setBotTimeoutSeconds(msg.timeoutSeconds ? String(msg.timeoutSeconds) : "");
    setIsBotMsgModalOpen(true);
  };

  const closeBotMsgModal = () => {
    setIsBotMsgModalOpen(false);
    setEditingBotMsgId(null);
  };

  // Custom Mutation handling for BOT to ensure correct modal closes
  const saveBotMutation = trpc.quickMessages.create.useMutation({
     onSuccess: () => { toast.success("Bot configurado!"); closeBotMsgModal(); refetchQuickMessages(); }
  });
  const updateBotMutation = trpc.quickMessages.update.useMutation({
     onSuccess: () => { toast.success("Bot atualizado!"); closeBotMsgModal(); refetchQuickMessages(); }
  });

  const handleSmartSaveBot = () => {
      if (!botContent.trim()) return toast.error("Conteúdo obrigatório");
      
      const fullCategory = `BOT-${botCategory}`;
      const timeoutMinutes = botTimeout ? parseInt(botTimeout, 10) : undefined;
      const timeoutSeconds = botTimeoutSeconds ? parseInt(botTimeoutSeconds, 10) : undefined;

      if (editingBotMsgId) {
          updateBotMutation.mutate({ 
            id: editingBotMsgId, 
            title: `BOT - ${botCategory}`, 
            content: botContent, 
            category: fullCategory,
            timeoutMinutes,
            timeoutSeconds
          });
      } else {
          saveBotMutation.mutate({ 
            title: `BOT - ${botCategory}`, 
            content: botContent, 
            category: fullCategory,
            timeoutMinutes,
            timeoutSeconds
          });
      }
  };


  // Filtered Lists
  const manualMessages = quickMessages?.filter((msg: any) => !(msg.category ?? "").startsWith("BOT-")) || [];
  const botMessages = quickMessages?.filter((msg: any) => (msg.category ?? "").startsWith("BOT-")) || [];

  const showTimeoutInput = ["aguardando_atendimento", "aguardando_resposta", "CSAT_TIMEOUT", "CSAT_PERGUNTA"].includes(botCategory);

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mensagens Automáticas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas respostas rápidas e automações do WhatsApp.
            </p>
          </div>
        </div>

        {/* MENSAGENS RÁPIDAS */}
        <Card className="border-t-4 border-t-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Mensagens Rápidas
                    </CardTitle>
                    <CardDescription>Respostas manuais para agilizar o atendimento.</CardDescription>
                </div>
                <Button onClick={openCreateQuickMsg} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Nova Mensagem
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Título</TableHead>
                                <TableHead>Conteúdo</TableHead>
                                <TableHead className="w-[150px]">Categoria</TableHead>
                                <TableHead className="w-[100px] text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Carregando...</TableCell>
                                </TableRow>
                            ) : manualMessages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Nenhuma mensagem cadastrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                manualMessages.map((msg: any) => (
                                    <TableRow key={msg.id}>
                                        <TableCell className="font-medium">{msg.title}</TableCell>
                                        <TableCell className="max-w-[400px] truncate text-muted-foreground" title={msg.content}>
                                            {msg.content}
                                        </TableCell>
                                        <TableCell>
                                            {msg.category && (
                                                <Badge variant="secondary" className="font-normal">
                                                    {msg.category}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditQuickMsg(msg)}>
                                                    <Pencil className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => {
                                                        if(confirm("Tem certeza que deseja excluir?")) {
                                                            deleteQuickMessageMutation.mutate({ id: msg.id });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* MENSAGENS BOT */}
        <Card className="border-t-4 border-t-purple-500/20 shadow-sm bg-purple-50/30 dark:bg-purple-900/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Automações do Robô
                    </CardTitle>
                    <CardDescription>Mensagens enviadas automaticamente pelo sistema.</CardDescription>
                </div>
                <Button onClick={openCreateBotMsg} variant="outline" size="sm" className="border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20">
                    <Plus className="mr-2 h-4 w-4" /> Configurar Automação
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {botMessages.map((msg: any) => {
                        const typeLabel = msg.category.replace("BOT-", "").replace(/_/g, " ").toUpperCase();
                        return (
                            <Card key={msg.id} className="bg-background border-purple-100 dark:border-purple-900 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                {typeLabel}
                                            </CardTitle>
                                            {msg.timeoutMinutes && (
                                                <div className="flex items-center text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full w-fit">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {msg.timeoutMinutes} min
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-100 transition-opacity">
                                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditBotMsg(msg)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6"
                                                onClick={() => deleteQuickMessageMutation.mutate({ id: msg.id })}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground line-clamp-4">
                                    {msg.content}
                                </CardContent>
                            </Card>
                        );
                    })}
                    {botMessages.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground text-sm border border-dashed rounded-lg bg-background/50">
                            Nenhuma automação configurada.
                        </div>
                    )}
                 </div>
            </CardContent>
        </Card>

        {/* Instruções / Placeholders */}
        <Card className="bg-muted/30 border-dashed">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-4 w-4" />
                    Guia de Variáveis (Placeholders)
                </CardTitle>
                <CardDescription>
                    Você pode usar as variáveis abaixo para personalizar suas mensagens. Elas serão substituídas automaticamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                        <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{name}}"}</code>
                        <span className="text-muted-foreground">Nome do Cliente</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                        <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{protocol}}"}</code>
                        <span className="text-muted-foreground">Protocolo</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{attendant}}"}</code>
                         <span className="text-muted-foreground">Nome do Atendente</span>
                    </div>
                     <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{contract}}"}</code>
                         <span className="text-muted-foreground">Contrato</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{department}}"}</code>
                         <span className="text-muted-foreground">Departamento</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{date}}"}</code>
                         <span className="text-muted-foreground">Data Atual</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{time}}"}</code>
                         <span className="text-muted-foreground">Hora Atual</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border">
                         <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">{"{{id}}"}</code>
                         <span className="text-muted-foreground">ID Interno</span>
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>

      {/* Modal Quick Messages */}
      <Dialog open={isQuickMsgModalOpen} onOpenChange={setIsQuickMsgModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingQuickMsgId ? "Editar Mensagem" : "Nova Mensagem Rápida"}</DialogTitle>
            <DialogDescription>
              Crie respostas padronizadas para agilizar o atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Saudação Inicial"
                value={quickMessageTitle}
                onChange={(e) => setQuickMessageTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria (Opcional)</Label>
              <Input
                id="category"
                placeholder="Ex: Financeiro"
                value={quickMessageCategory}
                onChange={(e) => setQuickMessageCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Mensagem</Label>
              <Textarea
                id="content"
                placeholder="Digite o conteúdo da mensagem..."
                className="min-h-[150px]"
                value={quickMessageContent}
                onChange={(e) => setQuickMessageContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dica: Use os placeholders do guia abaixo para personalizar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeQuickMsgModal}>Cancelar</Button>
            <Button onClick={handleSaveQuickMessage} disabled={createQuickMessageMutation.isPending || updateQuickMessageMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {editingQuickMsgId ? "Salvar Alterações" : "Criar Mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal BOT Messages */}
      <Dialog open={isBotMsgModalOpen} onOpenChange={setIsBotMsgModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurar Automação</DialogTitle>
            <DialogDescription>
              Defina o texto que o robô enviará automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-type">Tipo de Evento</Label>
              <Select value={botCategory} onValueChange={setBotCategory} disabled={!!editingBotMsgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boas_vindas">Boas-vindas (Novo Ticket)</SelectItem>
                  <SelectItem value="fora_expediente">Fora do Expediente</SelectItem>
                  <SelectItem value="feriado">Feriado</SelectItem>
                  <SelectItem value="ticket_fechado">Ticket Fechado</SelectItem>
                  <SelectItem value="aguardando_atendimento">Aguardando Atendimento (Inatividade)</SelectItem>
                  <SelectItem value="aguardando_resposta">Aguardando Resposta (Inatividade)</SelectItem>
                  <SelectItem value="CSAT_PERGUNTA">Pesquisa: Pergunta Inicial</SelectItem>
                  <SelectItem value="CSAT_EXCELENTE">Pesquisa: Resposta Excelente 🤩</SelectItem>
                  <SelectItem value="CSAT_BOM">Pesquisa: Resposta Bom 🙂</SelectItem>
                  <SelectItem value="CSAT_RUIM">Pesquisa: Resposta Ruim 😡</SelectItem>
                  <SelectItem value="SEM_RESPOSTA_CSAT">Pesquisa: Lembrete (Sem Resposta)</SelectItem>
                  <SelectItem value="CSAT_TIMEOUT">Pesquisa: Timeout (Não Respondido)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bot-content">Mensagem Automática</Label>
              <Textarea
                id="bot-content"
                placeholder="Olá! Em breve um atendente irá falar com você..."
                className="min-h-[150px]"
                value={botContent}
                onChange={(e) => setBotContent(e.target.value)}
              />
            </div>

            {botCategory === "CSAT_PERGUNTA" && (
              <div className="grid gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="bot-cooldown" className="text-blue-700 dark:text-blue-300 font-semibold">Cooldown Pós-Pesquisa (Segundos)</Label>
                </div>
                <Input
                  id="bot-cooldown"
                  type="number"
                  min="0"
                  placeholder="Ex: 60 (Bloqueia novos tickets por 1 minuto)"
                  value={botTimeoutSeconds}
                  onChange={(e) => setBotTimeoutSeconds(e.target.value)}
                  className="bg-white dark:bg-slate-950"
                />
                <p className="text-xs text-blue-600/80 dark:text-blue-400">
                  Tempo em segundos que o contato ficará bloqueado de abrir novos tickets após responder.
                </p>
              </div>
            )}

            {showTimeoutInput && (
               <div className={cn(
                  "grid gap-2",
                  botCategory === "CSAT_PERGUNTA" && "bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900"
               )}>
                <div className="flex items-center gap-2 mb-1">
                  {botCategory === "CSAT_PERGUNTA" && <Clock className="w-4 h-4 text-red-600" />}
                  <Label htmlFor="bot-timeout" className={cn(
                    botCategory === "CSAT_PERGUNTA" && "text-red-700 dark:text-red-300 font-semibold"
                  )}>Tempo sem interação (minutos)</Label>
                </div>
                <Input
                  id="bot-timeout"
                  type="number"
                  min="1"
                  placeholder="Ex: 10"
                  value={botTimeout}
                  onChange={(e) => setBotTimeout(e.target.value)}
                  className={cn(botCategory === "CSAT_PERGUNTA" && "bg-white dark:bg-slate-950")}
                />
                <p className={cn(
                  "text-xs",
                  botCategory === "CSAT_PERGUNTA" ? "text-red-600/80 dark:text-red-400" : "text-muted-foreground"
                )}>
                  {botCategory === "CSAT_TIMEOUT" || botCategory === "CSAT_PERGUNTA"
                    ? "Tempo até considerar a pesquisa expirada (envia Lembrete/Timeout)." 
                    : "O robô enviará a mensagem se não houver interação por esse tempo."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBotMsgModal}>Cancelar</Button>
            <Button onClick={handleSmartSaveBot} disabled={saveBotMutation.isPending || updateBotMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}



