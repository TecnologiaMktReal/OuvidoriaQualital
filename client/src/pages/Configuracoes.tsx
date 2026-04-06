import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Upload, Download, FileText, AlertCircle, CheckCircle2, MessageSquare, Plus, Trash2, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

export default function Configuracoes() {
  const [ClientesFile, setClientesFile] = useState<File | null>(null);
  const [contractsFile, setContractsFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [quickMessageTitle, setQuickMessageTitle] = useState("");
  const [quickMessageContent, setQuickMessageContent] = useState("");
  const [quickMessageCategory, setQuickMessageCategory] = useState("");
  
  const { data: quickMessages, refetch: refetchQuickMessages } = trpc.quickMessages.list.useQuery();
  
  const createQuickMessageMutation = trpc.quickMessages.create.useMutation({
    onSuccess: () => {
      toast.success("Mensagem rápida criada com sucesso!");
      setQuickMessageTitle("");
      setQuickMessageContent("");
      setQuickMessageCategory("");
      refetchQuickMessages();
    },
    onError: (error) => {
      toast.error(`Erro ao criar mensagem: ${error.message}`);
    },
  });
  
  const deleteQuickMessageMutation = trpc.quickMessages.delete.useMutation({
    onSuccess: () => {
      toast.success("Mensagem rápida excluída!");
      refetchQuickMessages();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir mensagem: ${error.message}`);
    },
  });
  
  const handleCreateQuickMessage = () => {
    if (!quickMessageTitle || !quickMessageContent) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    
    createQuickMessageMutation.mutate({
      title: quickMessageTitle,
      content: quickMessageContent,
      category: quickMessageCategory || undefined,
    });
  };
  
  const ClientesInputRef = useRef<HTMLInputElement>(null);
  const contractsInputRef = useRef<HTMLInputElement>(null);

  const importClientesMutation = trpc.import.importClientes.useMutation({
    onSuccess: (data) => {
      setImportResult({ type: "Clientes", ...data });
      toast.success(`${data.success} Clientes importados com sucesso!`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erros encontrados. Verifique o relatório.`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar Clientes: ${error.message}`);
    },
  });

  const importContractsMutation = trpc.import.importContracts.useMutation({
    onSuccess: (data) => {
      setImportResult({ type: "contracts", ...data });
      toast.success(`${data.success} contratos importados com sucesso!`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erros encontrados. Verifique o relatório.`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar contratos: ${error.message}`);
    },
  });

  const handleClientesImport = () => {
    if (!ClientesFile) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    Papa.parse(ClientesFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row: any) => ({
          registrationNumber: row.matricula || row.registrationNumber,
          name: row.nome || row.name,
          document: row.documento || row.document || row.cpf,
          email: row.email || undefined,
          phone: row.telefone || row.phone || undefined,
          birthDate: row.dataNascimento || row.birthDate || undefined,
          admissionDate: row.dataAdmissao || row.admissionDate || undefined,
          position: row.cargo || row.position || undefined,
          status: row.status || "ativo",
          contractId: row.contratoId || row.contractId ? Number(row.contratoId || row.contractId) : undefined,
        }));

        importClientesMutation.mutate({ data });
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      },
    });
  };

  const handleContractsImport = () => {
    if (!contractsFile) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    Papa.parse(contractsFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row: any) => ({
          name: row.nome || row.name,
          city: row.cidade || row.city || "N/A",
          state: row.uf || row.state || "CE",
          status: row.status || "ativo",
          validityDate: row.dataValidade || row.validityDate || undefined,
        }));

        importContractsMutation.mutate({ data });
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      },
    });
  };

  const downloadClientesTemplate = () => {
    const csv = `matricula,nome,documento,email,telefone,dataNascimento,dataAdmissao,cargo,status,contratoId
12345,João da Silva,123.456.789-00,joao@email.com,11999999999,1990-01-15,2020-03-01,Analista,ativo,1
67890,Maria Santos,987.654.321-00,maria@email.com,11988888888,1985-05-20,2019-06-15,Gerente,ativo,1`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_Clientes.csv";
    link.click();
  };

  const downloadContractsTemplate = () => {
    const csv = `nome,cidade,uf,status,dataValidade
Contrato Padrão,Fortaleza,CE,ativo,2025-12-31
Contrato Temporário,Caucaia,CE,ativo,2024-06-30`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_contratos.csv";
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema e importação de dados</p>
        </div>

        {/* Integrar WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Integrar WhatsApp
            </CardTitle>
            <CardDescription>
              Configure a integração com WhatsApp para receber e enviar mensagens automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/setup-whatsapp">
              <span className="inline-flex items-center text-[#00b7ff] hover:underline font-medium cursor-pointer">
                Acessar Setup WhatsApp →
              </span>
            </Link>
          </CardContent>
        </Card>

        {/* Importar Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Importar Clientes
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV para importar Clientes em massa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="Clientes-file">Arquivo CSV</Label>
                <Input
                  id="Clientes-file"
                  ref={ClientesInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setClientesFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                onClick={handleClientesImport}
                disabled={!ClientesFile || importClientesMutation.isPending}
              >
                {importClientesMutation.isPending ? (
                  <>Importando...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={downloadClientesTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Modelo
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Formato do CSV</AlertTitle>
              <AlertDescription>
                O arquivo deve conter as colunas: <strong>matricula, nome, documento, email, telefone, 
                dataNascimento, dataAdmissao, cargo, status, contratoId</strong>. 
                Campos obrigatórios: matricula, nome, documento.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Importar Contratos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Importar Contratos
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV para importar contratos em massa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="contracts-file">Arquivo CSV</Label>
                <Input
                  id="contracts-file"
                  ref={contractsInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setContractsFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                onClick={handleContractsImport}
                disabled={!contractsFile || importContractsMutation.isPending}
              >
                {importContractsMutation.isPending ? (
                  <>Importando...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={downloadContractsTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Modelo
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Formato do CSV</AlertTitle>
              <AlertDescription>
                O arquivo deve conter as colunas: <strong>nome, cidade, uf, status, dataValidade</strong>. 
                Campos obrigatórios: nome, cidade, uf.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Mensagens Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mensagens Rápidas
            </CardTitle>
            <CardDescription>
              Crie mensagens pré-definidas para uso rápido no WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formulário de Nova Mensagem */}
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid gap-2">
                <Label htmlFor="quick-message-title">Título</Label>
                <Input
                  id="quick-message-title"
                  placeholder="Ex: Saudação Inicial"
                  value={quickMessageTitle}
                  onChange={(e) => setQuickMessageTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quick-message-content">Mensagem</Label>
                <textarea
                  id="quick-message-content"
                  placeholder="Digite a mensagem..."
                  value={quickMessageContent}
                  onChange={(e) => setQuickMessageContent(e.target.value)}
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quick-message-category">Categoria (opcional)</Label>
                <Input
                  id="quick-message-category"
                  placeholder="Ex: Atendimento, Financeiro"
                  value={quickMessageCategory}
                  onChange={(e) => setQuickMessageCategory(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateQuickMessage}
                disabled={createQuickMessageMutation.isPending}
                className="w-full"
              >
                {createQuickMessageMutation.isPending ? (
                  <>Criando...</>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Mensagem
                  </>
                )}
              </Button>
            </div>

            {/* Lista de Mensagens */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Mensagens Cadastradas</h4>
              {quickMessages && quickMessages.length > 0 ? (
                <div className="space-y-2">
                  {quickMessages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{msg.title}</h5>
                          {msg.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {msg.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuickMessageMutation.mutate({ id: msg.id })}
                        disabled={deleteQuickMessageMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma mensagem rápida cadastrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Relatório de Importação */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Relatório de Importação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Registros Importados</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Erros Encontrados</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Detalhes dos Erros:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.errors.map((error: any, index: number) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Linha {error.row}</AlertTitle>
                        <AlertDescription>{error.error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}



