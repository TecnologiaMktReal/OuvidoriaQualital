import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Building2,
} from "lucide-react";

type Department = {
  id: number;
  name: string;
  description: string | null;
  responsibleUserId: number | null;
  responsibleUserName: string | null;
  isActive: boolean;
  createdAt: Date;
};

export default function Departamentos() {

  const utils = trpc.useUtils();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estados do modal de cadastro/edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    responsibleUserId: "",
    isActive: true,
  });

  // Queries
  const { data: departments = [], isLoading } = trpc.departments.list.useQuery();

  // Mutations
  const createMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Departamento criado com sucesso.");
      utils.departments.list.invalidate();
      closeModal();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar departamento.");
    },
  });

  const updateMutation = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Departamento atualizado com sucesso.");
      utils.departments.list.invalidate();
      closeModal();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar departamento.");
    },
  });

  const deleteMutation = trpc.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Departamento excluído com sucesso.");
      utils.departments.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir departamento.");
    },
  });

  const toggleStatusMutation = trpc.departments.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Status alterado com sucesso.");
      utils.departments.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar status.");
    },
  });

  // Funções auxiliares
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      responsibleUserId: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setEditingId(department.id);
    setFormData({
      name: department.name,
      description: department.description || "",
      responsibleUserId: department.responsibleUserId?.toString() || "",
      isActive: department.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      responsibleUserId: "",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome do departamento é obrigatório.");
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      responsibleUserId: formData.responsibleUserId
        ? parseInt(formData.responsibleUserId)
        : undefined,
      isActive: formData.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este departamento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate({ id });
  };

  // Filtrar e ordenar departamentos
  const filteredDepartments = (departments as Department[])
    .filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.responsibleUserName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && dept.isActive) ||
        (statusFilter === "inactive" && !dept.isActive);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <Layout>
      <div className="container mx-auto py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Departamentos</h1>
          </div>
          <p className="text-gray-600">
            Gerencie os departamentos do sistema
          </p>
        </div>

        {/* Filtros e Ações */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Busca */}
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <div className="w-full md:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação */}
            <div className="w-full md:w-48">
              <Label htmlFor="sort">Ordenar por</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger id="sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="createdAt">Data de Criação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Novo */}
            <Button onClick={openCreateModal} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Departamento
            </Button>
          </div>
        </div>

        {/* Tabela de Departamentos */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum departamento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDepartments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">
                            {department.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {department.description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {department.responsibleUserName || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            department.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {department.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(department.id)}
                            title={
                              department.isActive ? "Desativar" : "Ativar"
                            }
                          >
                            {department.isActive ? (
                              <PowerOff className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(department)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(department.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total de Departamentos</div>
            <div className="text-2xl font-bold text-gray-900">
              {departments.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Departamentos Ativos</div>
            <div className="text-2xl font-bold text-green-600">
              {departments.filter((d: Department) => d.isActive).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Departamentos Inativos</div>
            <div className="text-2xl font-bold text-red-600">
              {departments.filter((d: Department) => !d.isActive).length}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Departamento" : "Novo Departamento"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize as informações do departamento"
                : "Preencha os dados para criar um novo departamento"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Nome */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Atendimento, TI, Financeiro"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva as responsabilidades do departamento"
                  rows={3}
                />
              </div>

              {/* Responsável */}
              <div className="grid gap-2">
                <Label htmlFor="responsible">Responsável (ID do Usuário)</Label>
                <Input
                  id="responsible"
                  type="number"
                  value={formData.responsibleUserId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responsibleUserId: e.target.value,
                    })
                  }
                  placeholder="ID do usuário responsável"
                />
                <p className="text-xs text-gray-500">
                  Deixe em branco se não houver responsável definido
                </p>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label htmlFor="isActive">Status</Label>
                <Select
                  value={formData.isActive ? "true" : "false"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value === "true" })
                  }
                >
                  <SelectTrigger id="isActive">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}



