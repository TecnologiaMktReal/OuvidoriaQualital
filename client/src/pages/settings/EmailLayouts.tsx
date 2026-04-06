import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  Eye,
  Code,
  Star,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type EmailLayout = {
  id: number;
  name: string;
  description: string | null;
  htmlContent: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Lista de placeholders disponíveis
const PLACEHOLDERS = [
  { key: "{{nome}}", description: "Nome do Cliente" },
  { key: "{{email}}", description: "E-mail do Cliente" },
  { key: "{{contrato}}", description: "Nome do contrato" },
  { key: "{{departamento}}", description: "Nome do departamento" },
  { key: "{{ticket}}", description: "Número do ticket" },
  { key: "{{data}}", description: "Data atual" },
  { key: "{{hora}}", description: "Hora atual" },
  { key: "{{protocolo}}", description: "Número de protocolo" },
  { key: "{{mensagem}}", description: "Mensagem personalizada" },
  { key: "{{link}}", description: "Link de ação" },
];

// Componentes de animação HTML/CSS
const ANIMATION_COMPONENTS = [
  {
    name: "Fade In",
    code: `<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fade-in {
    animation: fadeIn 1s ease-in;
  }
</style>
<div class="fade-in">Seu conteúdo aqui</div>`,
  },
  {
    name: "Slide Down",
    code: `<style>
  @keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .slide-down {
    animation: slideDown 0.5s ease-out;
  }
</style>
<div class="slide-down">Seu conteúdo aqui</div>`,
  },
  {
    name: "Pulse",
    code: `<style>
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .pulse {
    animation: pulse 2s infinite;
  }
</style>
<div class="pulse">Seu conteúdo aqui</div>`,
  },
  {
    name: "Bounce",
    code: `<style>
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .bounce {
    animation: bounce 1s infinite;
  }
</style>
<div class="bounce">Seu conteúdo aqui</div>`,
  },
  {
    name: "Gradient Background",
    code: `<style>
  .gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    color: white;
  }
</style>
<div class="gradient-bg">Seu conteúdo aqui</div>`,
  },
];

export default function EmailLayouts() {
  const listQuery = trpc.emailLayouts.list.useQuery();
  const layouts = listQuery.data as EmailLayout[] | undefined;
  
  // Buscar o layout padrão (em uso)
  const defaultLayoutQuery = trpc.emailLayouts.getDefault.useQuery();
  const defaultLayout = defaultLayoutQuery.data as EmailLayout | null | undefined;
  
  const utils = trpc.useUtils();

  const [openCreate, setOpenCreate] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [openPreview, setOpenPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const [openDelete, setOpenDelete] = useState(false);
  const [deletingLayout, setDeletingLayout] = useState<EmailLayout | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const createMutation = trpc.emailLayouts.create.useMutation({
    onSuccess: () => {
      toast.success("Layout criado com sucesso!");
      utils.emailLayouts.list.invalidate();
      utils.emailLayouts.getDefault.invalidate();
      setOpenCreate(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar layout: ${error.message}`);
    },
  });

  const updateMutation = trpc.emailLayouts.update.useMutation({
    onSuccess: () => {
      toast.success("Layout atualizado com sucesso!");
      utils.emailLayouts.list.invalidate();
      utils.emailLayouts.getDefault.invalidate();
      setOpenCreate(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar layout: ${error.message}`);
    },
  });

  const deleteMutation = trpc.emailLayouts.delete.useMutation({
    onSuccess: () => {
      toast.success("Layout excluído com sucesso!");
      utils.emailLayouts.list.invalidate();
      utils.emailLayouts.getDefault.invalidate();
      setOpenDelete(false);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir layout: ${error.message}`);
    },
  });

  const setDefaultMutation = trpc.emailLayouts.setDefault.useMutation({
    onSuccess: () => {
      toast.success("Layout definido como padrão!");
      utils.emailLayouts.list.invalidate();
      utils.emailLayouts.getDefault.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao definir padrão: ${error.message}`);
    },
  });

  const createDefaultLayoutMutation = trpc.setup.createDefaultEmailLayout.useMutation({
    onSuccess: (data) => {
      if (data.created) {
        toast.success("Layout padrão criado com sucesso!");
      } else {
        toast.info("Layout padrão já existe!");
      }
      utils.emailLayouts.list.invalidate();
      utils.emailLayouts.getDefault.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar layout padrão: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setHtmlContent("");
    setIsActive(true);
    setMode("create");
    setEditingId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      createMutation.mutate({
        name,
        description: description || undefined,
        htmlContent,
        isActive,
      });
    } else if (mode === "edit" && editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        description: description || undefined,
        htmlContent,
        isActive,
      });
    }
  };

  const handleEdit = (layout: EmailLayout) => {
    setMode("edit");
    setEditingId(layout.id);
    setName(layout.name);
    setDescription(layout.description || "");
    setHtmlContent(layout.htmlContent);
    setIsActive(layout.isActive);
    setOpenCreate(true);
  };

  const handleDelete = (layout: EmailLayout) => {
    setDeletingLayout(layout);
    setOpenDelete(true);
  };

  const confirmDelete = () => {
    if (!deletingLayout) return;
    deleteMutation.mutate({ id: deletingLayout.id });
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id });
  };

  const handlePreview = (html: string) => {
    setPreviewHtml(html);
    setOpenPreview(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const filteredLayouts = layouts?.filter((layout) =>
    layout.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Layout E-mail</h1>
          </div>
          <p className="text-gray-600">
            Gerencie os templates HTML para envio de e-mails
          </p>
        </div>

        {/* Layout Atual em Uso */}
        {defaultLayoutQuery.isLoading ? (
          <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
          </Card>
        ) : defaultLayout ? (
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md rounded-2xl overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">Layout Atual em Uso</h3>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Padrão
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Este é o template HTML que está sendo utilizado para todos os envios de e-mail do sistema
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-gray-500">Nome:</span>
                        <span className="text-sm font-bold text-gray-900">{defaultLayout.name}</span>
                      </div>
                      {defaultLayout.description && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold uppercase text-gray-500 mt-0.5">Descrição:</span>
                          <span className="text-sm text-gray-700">{defaultLayout.description}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-gray-500">Última atualização:</span>
                        <span className="text-sm text-gray-700">
                          {new Date(defaultLayout.updatedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(defaultLayout.htmlContent)}
                    className="bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(defaultLayout)}
                    className="bg-white hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(defaultLayout.htmlContent)}
                    className="bg-white hover:bg-gray-50"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Copiar HTML
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500 rounded-xl">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum Layout Padrão Definido</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure um layout como padrão para que ele seja utilizado nos envios de e-mail do sistema
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createDefaultLayoutMutation.mutate()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createDefaultLayoutMutation.isPending}
                  >
                    {createDefaultLayoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Usar Template Padrão
                  </Button>
                  <Button
                    onClick={() => {
                      resetForm();
                      setOpenCreate(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-amber-300 hover:bg-amber-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Personalizado
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Barra de Ações e Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
            {/* Busca */}
            <div className="flex-1 min-w-[250px]">
              <Label htmlFor="search" className="text-xs font-semibold uppercase text-gray-500 mb-2 block">
                Buscar Layout
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome do layout..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Botão Criar */}
            <Button
              onClick={() => {
                resetForm();
                setOpenCreate(true);
              }}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Layout
            </Button>
          </div>
        </div>

        {/* Tabela de Layouts */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b border-gray-100">
                  <TableHead className="font-bold text-gray-700">Nome</TableHead>
                  <TableHead className="font-bold text-gray-700">Descrição</TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">Padrão</TableHead>
                  <TableHead className="font-bold text-gray-700 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLayouts && filteredLayouts.length > 0 ? (
                  filteredLayouts.map((layout) => (
                    <TableRow key={layout.id} className="group hover:bg-gray-50/30 transition-all">
                      <TableCell className="font-bold text-gray-900">{layout.name}</TableCell>
                      <TableCell className="text-gray-600 max-w-md truncate">
                        {layout.description || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={layout.isActive ? "default" : "secondary"}
                          className={layout.isActive ? "bg-emerald-100 text-emerald-700" : ""}
                        >
                          {layout.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {layout.isDefault ? (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Padrão
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(layout.id)}
                            className="text-gray-400 hover:text-amber-600"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(layout.htmlContent)}
                            className="h-9 w-9"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(layout)}
                            className="h-9 w-9"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(layout)}
                            className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={layout.isDefault}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      Nenhum layout encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal de Criação/Edição */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Novo Layout de E-mail" : "Editar Layout de E-mail"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Crie um novo template HTML para envio de e-mails"
                  : "Atualize as informações do template"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
                <TabsTrigger value="animations">Animações</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="flex-1 overflow-auto">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Layout *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Template CSAT"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Breve descrição do template"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="htmlContent">HTML do Template *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(htmlContent)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                    <Textarea
                      id="htmlContent"
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Cole aqui o código HTML do template..."
                      className="font-mono text-sm min-h-[400px]"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        Layout ativo
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenCreate(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {mode === "create" ? "Criar Layout" : "Salvar Alterações"}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="placeholders" className="flex-1 overflow-auto">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Clique para copiar o placeholder e cole no seu HTML
                    </p>
                    {PLACEHOLDERS.map((placeholder) => (
                      <div
                        key={placeholder.key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => copyToClipboard(placeholder.key)}
                      >
                        <div>
                          <code className="text-sm font-mono text-blue-600">{placeholder.key}</code>
                          <p className="text-xs text-gray-600 mt-1">{placeholder.description}</p>
                        </div>
                        <Copy className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="animations" className="flex-1 overflow-auto">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4 pr-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Componentes prontos de animação CSS para seus e-mails
                    </p>
                    {ANIMATION_COMPONENTS.map((component) => (
                      <div key={component.name} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{component.name}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(component.code)}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Copiar
                          </Button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                          <code>{component.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Modal de Preview */}
        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Preview do Layout</DialogTitle>
              <DialogDescription>
                Visualização do template HTML
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg overflow-auto max-h-[70vh] bg-white">
              <iframe
                srcDoc={previewHtml}
                className="w-full min-h-[500px]"
                title="Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o layout "{deletingLayout?.name}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}



