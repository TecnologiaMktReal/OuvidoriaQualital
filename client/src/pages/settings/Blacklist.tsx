import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function SettingsBlacklist() {
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Blacklist</h2>
        </div>

        <Tabs defaultValue="email" onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="email">E-mails Bloqueados</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Bloqueado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4">
            <BlacklistTable type="email" />
          </TabsContent>
          
          <TabsContent value="whatsapp" className="space-y-4">
            <BlacklistTable type="whatsapp" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

const formSchema = z.object({
  value: z.string().min(1, "O valor é obrigatório"),
  reason: z.string().optional(),
});

function BlacklistTable({ type }: { type: "email" | "whatsapp" }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: number; value: string; reason: string | null } | null>(null);

  const utils = trpc.useContext();
  const { data: blacklist, isLoading } = trpc.blacklist.list.useQuery({ type });
  
  const createMutation = trpc.blacklist.add.useMutation({
    onSuccess: () => {
      utils.blacklist.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Adicionado à blacklist com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const updateMutation = trpc.blacklist.update.useMutation({
      onSuccess: () => {
          utils.blacklist.list.invalidate();
          setEditingItem(null);
          toast.success("Atualizado com sucesso!");
      },
      onError: (err) => {
          toast.error(err.message);
      }
  });

  const deleteMutation = trpc.blacklist.remove.useMutation({
      onSuccess: () => {
          utils.blacklist.list.invalidate();
          toast.success("Removido da blacklist com sucesso!");
      },
      onError: (err) => {
          toast.error(err.message);
      }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
      reason: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({
      type,
      value: values.value,
      reason: values.reason,
    });
    form.reset();
  }

  function onUpdate(values: z.infer<typeof formSchema>) {
      if (!editingItem) return;
      updateMutation.mutate({
          id: editingItem.id,
          data: values
      });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{type === 'email' ? 'Gestão de E-mails Bloqueados' : 'Gestão de Números WhatsApp Bloqueados'}</CardTitle>
            <CardDescription>
            Gerencie os {type === 'email' ? 'endereços de e-mail' : 'números de telefone'} que não devem gerar tickets automaticamente.
            </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar à Blacklist</DialogTitle>
              <DialogDescription>
                Novas mensagens deste contato serão ignoradas.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{type === 'email' ? 'E-mail' : 'Telefone'}</FormLabel>
                      <FormControl>
                        <Input placeholder={type === 'email' ? 'exemplo@spam.com' : '5511999999999'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Spam frequente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Blacklist</DialogTitle>
                </DialogHeader>
                <EditForm 
                    item={editingItem} 
                    onSubmit={onUpdate} 
                    isLoading={updateMutation.isPending} 
                    type={type}
                />
            </DialogContent>
        </Dialog>

      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{type === 'email' ? 'E-mail' : 'Telefone'}</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data de Bloqueio</TableHead>
                <TableHead>Última Mensagem</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : blacklist?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                blacklist?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.value}</TableCell>
                    <TableCell>{item.reason || "-"}</TableCell>
                    <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                        <LastMessageCell value={item.value} />
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setEditingItem({ id: item.id, value: item.value, reason: item.reason })}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            O contato <b>{item.value}</b> poderá enviar mensagens e abrir tickets novamente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteMutation.mutate({ id: item.id })}>
                                            Confirmar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
  );
}

function EditForm({ item, onSubmit, isLoading, type }: any) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: item?.value || "",
            reason: item?.reason || ""
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{type === 'email' ? 'E-mail' : 'Telefone'}</FormLabel>
                        <FormControl>
                        <Input placeholder={type === 'email' ? 'exemplo@spam.com' : '5511999999999'} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motivo (opcional)</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: Spam frequente" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function LastMessageCell({ value }: { value: string }) {
    const { data, isLoading } = trpc.blacklist.getLastMessage.useQuery({ value });
    
    if (isLoading) return <span className="text-muted-foreground text-xs">Carregando...</span>;
    if (!data) return <span className="text-muted-foreground text-xs">-</span>;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                     <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {data.message}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                    <p className="font-semibold text-xs mb-1">
                        {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{data.message}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}



