import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Settings2,
  FileText,
  History
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const scheduleSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  reportType: z.enum(["resumo_diario", "resumo_semanal", "resumo_mensal", "resumo_anual"]),
  period: z.enum(["ontem", "hoje", "semana_atual", "mes_atual", "ano_atual"]),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido (HH:mm)"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  message: z.string().optional().nullable(),
  channels: z.array(z.string()).min(1, "Selecione pelo menos um canal"),
  recipients: z.array(z.number()).min(1, "Selecione pelo menos um destinatário"),
  isActive: z.boolean().default(true),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const reportTypeLabels: Record<string, string> = {
  resumo_diario: "Resumo Diário",
  resumo_semanal: "Resumo Semanal",
  resumo_mensal: "Resumo Mensal",
  resumo_anual: "Resumo Anual",
};

const periodLabels: Record<string, string> = {
  ontem: "Ontem",
  hoje: "Hoje",
  semana_atual: "Semana Atual",
  mes_atual: "Mês Atual",
  ano_atual: "Ano Atual",
};

export default function AgendamentoEnvio() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useContext();
  const { data: schedules, isLoading: isLoadingSchedules } = trpc.reportSchedules.list.useQuery();
  const { data: usersData } = trpc.users.list.useQuery({ pageSize: 100 });
  const { data: logs, refetch: refetchLogs } = trpc.reportSchedules.getLogs.useQuery({});

  const createMutation = trpc.reportSchedules.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      setIsDialogOpen(false);
      utils.reportSchedules.list.invalidate();
    },
    onError: (err) => toast.error(`Erro ao criar: ${err.message}`),
  });

  const updateMutation = trpc.reportSchedules.update.useMutation({
    onSuccess: () => {
      toast.success("Agendamento atualizado com sucesso!");
      setIsDialogOpen(false);
      setEditingId(null);
      utils.reportSchedules.list.invalidate();
    },
    onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const deleteMutation = trpc.reportSchedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento removido!");
      utils.reportSchedules.list.invalidate();
    },
    onError: (err) => toast.error(`Erro ao remover: ${err.message}`),
  });

  const toggleMutation = trpc.reportSchedules.toggleActive.useMutation({
    onSuccess: () => utils.reportSchedules.list.invalidate(),
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: "",
      reportType: "resumo_diario",
      period: "ontem",
      scheduleTime: "08:00",
      frequency: "daily",
      message: "",
      channels: ["email"],
      recipients: [],
      isActive: true,
    },
  });

  const selectedChannels = watch("channels") || [];
  const selectedRecipients = watch("recipients") || [];

  const onSubmit = (values: ScheduleFormValues) => {
    if (editingId) {
      updateMutation.mutate({ ...values, id: editingId });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingId(schedule.id);
    reset({
      name: schedule.name,
      reportType: schedule.reportType,
      period: schedule.period,
      scheduleTime: schedule.scheduleTime,
      frequency: schedule.frequency,
      message: schedule.message,
      channels: schedule.channels,
      recipients: schedule.recipients,
      isActive: schedule.isActive,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingId(null);
    reset({
      name: "",
      reportType: "resumo_diario",
      period: "ontem",
      scheduleTime: "08:00",
      frequency: "daily",
      message: "",
      channels: ["email"],
      recipients: [],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <Send className="w-8 h-8" />
              </span>
              Agendamento de Envio
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Gerencie o envio automático de relatórios em PDF por WhatsApp e E-mail.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openNewDialog}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all h-12 px-6 rounded-xl gap-2 text-base font-bold"
              >
                <Plus className="w-5 h-5" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingId ? "Editar Agendamento" : "Configurar Novo Agendamento"}</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Defina o relatório, período, horário e destinatários.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome do Agendamento</Label>
                    <Input {...control.register("name")} placeholder="Ex: Resumo Diário para Gestores" className="h-11 rounded-lg border-slate-200" />
                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Tipo de Relatório</Label>
                    <Controller
                      name="reportType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-lg border-slate-200">
                            <SelectValue placeholder="Selecione o relatório" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resumo_diario">Resumo Diário</SelectItem>
                            <SelectItem value="resumo_semanal">Resumo Semanal</SelectItem>
                            <SelectItem value="resumo_mensal">Resumo Mensal</SelectItem>
                            <SelectItem value="resumo_anual">Resumo Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Período dos Dados</Label>
                    <Controller
                      name="period"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-11 rounded-lg border-slate-200">
                            <SelectValue placeholder="Selecione o período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ontem">Ontem</SelectItem>
                            <SelectItem value="hoje">Hoje</SelectItem>
                            <SelectItem value="semana_atual">Semana Atual</SelectItem>
                            <SelectItem value="mes_atual">Mês Atual</SelectItem>
                            <SelectItem value="ano_atual">Ano Atual</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Horário de Envio</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <Input {...control.register("scheduleTime")} type="time" className="h-11 rounded-lg border-slate-200" />
                    </div>
                    {errors.scheduleTime && <p className="text-xs text-red-500 font-medium">{errors.scheduleTime.message}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-bold text-base">Canais de Envio</Label>
                  <div className="flex gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="email" 
                        checked={selectedChannels.includes("email")}
                        onCheckedChange={(checked) => {
                          const current = [...selectedChannels];
                          if (checked) current.push("email");
                          else {
                            const idx = current.indexOf("email");
                            if (idx > -1) current.splice(idx, 1);
                          }
                          setValue("channels", current);
                        }}
                      />
                      <label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <Mail className="w-4 h-4 text-blue-500" /> E-mail
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="whatsapp" 
                        checked={selectedChannels.includes("whatsapp")}
                        onCheckedChange={(checked) => {
                          const current = [...selectedChannels];
                          if (checked) current.push("whatsapp");
                          else {
                            const idx = current.indexOf("whatsapp");
                            if (idx > -1) current.splice(idx, 1);
                          }
                          setValue("channels", current);
                        }}
                      />
                      <label htmlFor="whatsapp" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                      </label>
                    </div>
                  </div>
                  {errors.channels && <p className="text-xs text-red-500 font-medium">{errors.channels.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Mensagem de Acompanhamento</Label>
                  <Textarea 
                    {...control.register("message")}
                    placeholder="Olá, segue em anexo o relatório agendado..."
                    className="min-h-[100px] rounded-xl border-slate-200"
                  />
                  <p className="text-[10px] text-slate-500">Esta mensagem será enviada junto com o arquivo PDF.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-base">Destinatários ({selectedRecipients.length})</Label>
                    <p className="text-xs text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => setValue("recipients", usersData?.items.map(u => u.id) || [])}>Selecionar Todos</p>
                  </div>
                  <ScrollArea className="h-64 rounded-xl border border-slate-200 bg-white dark:bg-slate-950 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {usersData?.items.map((user) => (
                        <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100">
                          <Checkbox 
                            id={`user-${user.id}`}
                            checked={selectedRecipients.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const current = [...selectedRecipients];
                              if (checked) current.push(user.id);
                              else {
                                const idx = current.indexOf(user.id);
                                if (idx > -1) current.splice(idx, 1);
                              }
                              setValue("recipients", current);
                            }}
                          />
                          <Label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{user.fullName}</div>
                            <div className="text-[10px] text-slate-500">{user.email || user.phone || "Sem contato"}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {errors.recipients && <p className="text-xs text-red-500 font-medium">{errors.recipients.message}</p>}
                </div>

                <DialogFooter className="pt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-8 h-12 text-base font-bold">Cancelar</Button>
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl px-12 h-12 text-base font-bold gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <RefreshCw className="w-5 h-5 animate-spin" />}
                    Salvar Agendamento
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="border-0 shadow-2xl shadow-indigo-100/50 dark:shadow-none bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border-slate-200/50">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <Settings2 className="w-6 h-6 text-indigo-500" />
                Agendamentos Ativos
              </CardTitle>
              <CardDescription>Visualize e gerencie as regras de envio automático.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingSchedules ? (
                <div className="py-20 flex justify-center"><RefreshCw className="w-10 h-10 animate-spin text-indigo-500" /></div>
              ) : schedules?.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <CalendarDays className="w-10 h-10" />
                   </div>
                   <p className="text-slate-500 font-medium">Nenhum agendamento configurado.</p>
                   <Button variant="outline" onClick={openNewDialog}>Criar meu primeiro agendamento</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead className="font-bold py-4 pl-6">NOME / STATUS</TableHead>
                        <TableHead className="font-bold">RELATÓRIO / PERÍODO</TableHead>
                        <TableHead className="font-bold text-center">HORÁRIO</TableHead>
                        <TableHead className="font-bold">CANAIS / DESTINATÁRIOS</TableHead>
                        <TableHead className="font-bold text-right pr-6">AÇÕES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules?.map((schedule) => (
                        <TableRow key={schedule.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <Switch 
                                checked={schedule.isActive} 
                                onCheckedChange={(checked) => toggleMutation.mutate({ id: schedule.id, isActive: checked })}
                              />
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">{schedule.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: #{schedule.id.toString().padStart(4, "0")}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{reportTypeLabels[schedule.reportType]}</span>
                              <Badge variant="outline" className="w-fit mt-1 text-[10px]">{periodLabels[schedule.period]}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 font-mono text-sm gap-2">
                               <Clock className="w-3.5 h-3.5" />
                               {schedule.scheduleTime}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-1">
                                {(schedule.channels as string[]).map((c) => (
                                  <div key={c} className={cn(
                                    "w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm",
                                    c === "email" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                                  )}>
                                    {c === "email" ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {(schedule.recipients as number[]).length} usuários
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)} className="hover:bg-indigo-100 text-indigo-600"><Settings2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if(confirm("Remover este agendamento?")) deleteMutation.mutate({ id: schedule.id }); }} className="hover:bg-red-100 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl border-slate-200/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <History className="w-6 h-6 text-slate-500" />
                  Log de Envio (Histórico)
                </CardTitle>
                <CardDescription>Histórico de execuções e status de entrega.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => refetchLogs()} className="gap-2"><RefreshCw className="w-4 h-4" /> Atualizar</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="font-bold py-3">DATA / HORA</TableHead>
                      <TableHead className="font-bold">AGENDAMENTO / RELATÓRIO</TableHead>
                      <TableHead className="font-bold">CANAL</TableHead>
                      <TableHead className="font-bold">DESTINATÁRIO</TableHead>
                      <TableHead className="font-bold">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-slate-400 italic">Nenhum registro de envio encontrado.</TableCell>
                      </TableRow>
                    ) : logs?.map((log) => (
                      <TableRow key={log.id} className="text-sm">
                        <TableCell className="font-mono text-xs">{format(new Date(log.sentAt), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-700 dark:text-slate-300">{reportTypeLabels[log.reportType] || log.reportType}</div>
                          <div className="text-[10px] text-slate-500">Regra ID: #{log.scheduleId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1.5 capitalize font-bold">
                            {log.channel === "email" ? <Mail className="w-3 h-3 text-blue-500" /> : <MessageCircle className="w-3 h-3 text-green-500" />}
                            {log.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <div className="font-medium text-slate-700 dark:text-slate-300">{log.recipientName || "Sistema"}</div>
                           <div className="text-[10px] text-slate-400">{log.recipientValue}</div>
                        </TableCell>
                        <TableCell>
                          {log.status === "success" ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Enviado</div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-600 font-bold" title={log.errorMessage || "Erro desconhecido"}>
                              <XCircle className="w-4 h-4" /> Falhou
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}



