import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BellRing, Save, Loader2, Check, ChevronsUpDown, User, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function AlertasGestao() {
  const [activeWait, setActiveWait] = useState<number | null>(null);

  const { data: configs, refetch, isLoading } = trpc.alerts.getConfigs.useQuery();
  const updateMutation = trpc.alerts.updateConfig.useMutation();
  const { data: usersData } = trpc.users.list.useQuery({ pageSize: 100 });
  const users = usersData?.items ?? [];

  const handleUpdate = async (config: any, updates: any) => {
    setActiveWait(config.id);
    try {
      await updateMutation.mutateAsync({
        id: config.id,
        threshold: updates.threshold ?? config.threshold,
        channels: updates.channels ?? config.channels,
        isActive: updates.isActive ?? config.isActive,
        cooldownMinutes: updates.cooldownMinutes ?? config.cooldownMinutes,
        windowMinutes: updates.windowMinutes ?? config.windowMinutes,
        whatsappRecipients: updates.whatsappRecipients !== undefined ? updates.whatsappRecipients : config.whatsappRecipients,
        emailRecipients: updates.emailRecipients !== undefined ? updates.emailRecipients : config.emailRecipients,
        customMessage: updates.customMessage !== undefined ? updates.customMessage : config.customMessage
      });
      toast.success("Configuração atualizada com sucesso!");
      await refetch();
    } catch (e) {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setActiveWait(null);
    }
  };

  const toggleChannel = (config: any, channel: string) => {
    const channels = Array.isArray(config.channels) ? [...config.channels] : [];
    if (channels.includes(channel)) {
      return channels.filter((c: string) => c !== channel);
    } else {
      return [...channels, channel];
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-100px)]">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center gap-2 mb-8">
            <div className="p-2 bg-blue-50 rounded-lg">
                <BellRing className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Alertas de Gestão</h1>
        </div>

        <div className="grid gap-6">
          {configs?.map((config: any) => (
            <Card key={config.id} className="shadow-lg bg-white ring-1 ring-slate-200/50 rounded-xl overflow-hidden">
              <div className={`h-1.5 w-full ${config.isActive ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-200'}`} />
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                        {config.name}
                        {config.isActive && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </CardTitle>
                    <CardDescription className="mt-1 text-slate-500">{config.description}</CardDescription>
                  </div>
                  <Switch 
                    checked={config.isActive} 
                    onCheckedChange={(val) => handleUpdate(config, { isActive: val })}
                  />
                </div>
              </CardHeader>

              {config.isActive && (
                <CardContent className="bg-slate-50/50 pt-6 border-t border-slate-100">
                  <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Coluna 1: Limites */}
                    <div className="space-y-4">
                        <Label className="text-blue-600 uppercase text-xs font-bold tracking-wider">Parâmetros de Disparo</Label>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            {config.type === "bad_csat" ? (
                                <div className="space-y-3">
                                    <Label htmlFor={`t-${config.id}`}>Quantidade de Avaliações RUIM</Label>
                                    <div className="flex items-center gap-4">
                                        <Input 
                                            id={`t-${config.id}`}
                                            type="number" 
                                            defaultValue={config.threshold}
                                            className="h-10 w-24 text-lg font-medium"
                                            onBlur={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val !== config.threshold) handleUpdate(config, { threshold: val });
                                            }}
                                        />
                                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                            <span className="text-xl">👎</span>
                                            <span className="font-bold text-red-600">Ruim</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 italic">Disparar se houver X avaliações RUIM dentro da janela.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Label htmlFor={`t-${config.id}`}>
                                        {config.type === "queue_volume" ? "Quantidade Máxima na Fila" : "Volume Máximo / Janela"}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id={`t-${config.id}`}
                                            type="number" 
                                            defaultValue={config.threshold}
                                            className="h-10 text-lg font-medium"
                                            onBlur={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val !== config.threshold) handleUpdate(config, { threshold: val });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor={`wm-${config.id}`} className="text-[10px] uppercase font-bold text-slate-400">Janela de Tempo (Min)</Label>
                                    <Input 
                                        id={`wm-${config.id}`}
                                        type="number" 
                                        defaultValue={config.windowMinutes}
                                        className="h-9"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val !== config.windowMinutes) handleUpdate(config, { windowMinutes: val });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor={`cd-${config.id}`} className="text-[10px] uppercase font-bold text-slate-400">Intervalo entre Alertas (Min)</Label>
                                    <Input 
                                        id={`cd-${config.id}`}
                                        type="number" 
                                        defaultValue={config.cooldownMinutes}
                                        className="h-9"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val !== config.cooldownMinutes) handleUpdate(config, { cooldownMinutes: val });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                            <Label className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                Mensagem do Alerta
                            </Label>
                            <Textarea 
                                placeholder="Descreva a mensagem que será enviada no alerta..."
                                defaultValue={config.customMessage}
                                className="min-h-[100px] text-sm"
                                onBlur={(e) => {
                                    if (e.target.value !== config.customMessage) {
                                        handleUpdate(config, { customMessage: e.target.value });
                                    }
                                }}
                            />
                            <p className="text-[10px] text-slate-400 italic">
                                Use esta mensagem para detalhar o alerta nos canais de notificação.
                            </p>
                        </div>
                    </div>

                    {/* Coluna 2: Canais */}
                    <div className="space-y-4">
                        <Label className="text-blue-600 uppercase text-xs font-bold tracking-wider">Canais de Notificação</Label>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <div className="p-3 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-start space-x-3 mb-3">
                                    <Checkbox 
                                        id={`wa-${config.id}`} 
                                        checked={config.channels.includes("whatsapp")}
                                        onCheckedChange={() => handleUpdate(config, { channels: toggleChannel(config, "whatsapp") })}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor={`wa-${config.id}`} className="cursor-pointer font-semibold text-slate-700 flex items-center gap-2">
                                            WhatsApp
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                            Selecione quem receberá o alerta via WhatsApp.
                                        </p>
                                    </div>
                                </div>
                                
                                {config.channels.includes("whatsapp") && (
                                    <div className="pl-7 space-y-2">
                                        <UserMultiSelect 
                                            users={users}
                                            selectedIds={config.whatsappRecipients || []}
                                            onChange={(ids: number[]) => handleUpdate(config, { whatsappRecipients: ids })}
                                            placeholder="Selecionar usuários..."
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-3 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-start space-x-3 mb-3">
                                    <Checkbox 
                                        id={`email-${config.id}`} 
                                        checked={config.channels.includes("email")}
                                        onCheckedChange={() => handleUpdate(config, { channels: toggleChannel(config, "email") })}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor={`email-${config.id}`} className="cursor-pointer font-semibold text-slate-700">
                                            E-mail
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                            Selecione quem receberá o alerta por E-mail.
                                        </p>
                                    </div>
                                </div>

                                {config.channels.includes("email") && (
                                    <div className="pl-7 space-y-2">
                                        <UserMultiSelect 
                                            users={users}
                                            selectedIds={config.emailRecipients || []}
                                            onChange={(ids: number[]) => handleUpdate(config, { emailRecipients: ids })}
                                            placeholder="Selecionar usuários..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                  </div>
                  
                  {activeWait === config.id && (
                     <div className="flex justify-end mt-4 text-blue-600 text-sm items-center gap-2 animate-pulse">
                        <Save className="w-4 h-4" /> Salvando...
                     </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}

          {!configs?.length && (
            <div className="text-center py-12 text-slate-400">
                Nenhuma configuração de alerta disponível.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function UserMultiSelect({ users, selectedIds, onChange, placeholder }: any) {
    const [open, setOpen] = useState(false);

    const toggleUser = (userId: number) => {
        const newSelection = selectedIds.includes(userId)
            ? selectedIds.filter((id: number) => id !== userId)
            : [...selectedIds, userId];
        onChange(newSelection);
    };

    const selectedUsers = users.filter((u: any) => selectedIds.includes(u.id));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-10 h-auto py-2 bg-white hover:bg-white border-slate-200"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedUsers.length > 0 ? (
                            selectedUsers.map((user: any) => (
                                <Badge 
                                    key={user.id} 
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] py-0 px-1.5"
                                >
                                    {user.fullName || user.nickname || user.name}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-slate-400 text-xs font-normal">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command className="border-none">
                    <CommandInput placeholder="Buscar usuário..." className="h-9" />
                    <CommandList className="max-h-[200px]">
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                        <CommandGroup>
                            {users.map((user: any) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.fullName || user.name || ""}
                                    onSelect={() => toggleUser(user.id)}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-blue-600",
                                            selectedIds.includes(user.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.fullName || user.name}</span>
                                        <span className="text-[10px] text-slate-400">{user.email}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}




