
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, AlertCircle, Loader2, ArrowRight, Save, X, FileSpreadsheet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';

interface ClienteImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ImportStep = "upload" | "preview" | "processing" | "results";

export function ClienteImportModal({ open, onOpenChange, onSuccess }: ClienteImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'update' | 'error'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries e Mutations
  const { refetch: generateModel } = trpc.clientes.generateImportModel.useQuery(undefined, { 
    enabled: false,
    retry: false
  });

  const previewMutation = trpc.clientes.previewImport.useMutation();
  const processMutation = trpc.clientes.processImport.useMutation();

  const handleDownloadModel = async () => {
    try {
      const { data } = await generateModel();
      if (!data) return;
      
      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "modelo_importacao_Clientes.csv";
      link.click();
      toast.success("Modelo baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar modelo.");
    }
  };

  useEffect(() => {
    if (previewMutation.data) {
      if (previewMutation.data.summary.error > 0) {
        setFilter('error');
      } else {
        setFilter('all');
      }
    }
  }, [previewMutation.data]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      previewMutation.mutate({ csvContent: text });
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const filteredRows = previewMutation.data?.rows.filter((row: any) => {
    if (filter === 'all') return true;
    return row.status === filter;
  }) || [];

  const handleProcess = async () => {
    if (!previewMutation.data) return;
    
    setStep("processing");
    try {
        await processMutation.mutateAsync({ rows: previewMutation.data.rows });
        setStep("results");
        onSuccess(); // Trigger refresh on parent
    } catch (error) {
        toast.error("Erro ao processar importação.");
        // Stay on processing or move to results with error?
        // Ideally processMutation returns errors gracefully.
    }
  };

  const handleClose = () => {
     onOpenChange(false);
     // Reset state after transition
     setTimeout(() => {
        setStep("upload");
        setCsvContent(null);
        setFileName(null);
        previewMutation.reset();
        processMutation.reset();
     }, 300);
  };

  const exportResults = () => {
      if (!processMutation.data) return;

      const results = processMutation.data.details.map(item => ({
          Matricula: item.data.registrationNumber,
          Nome: item.data.name,
          Documento: item.data.document,
          Status: item.status === 'new' ? 'Novo' : item.status === 'update' ? 'Atualização' : 'Erro',
          Resultado: item.processingStatus === 'created' ? 'CRIADO' : 
                     item.processingStatus === 'updated' ? 'ATUALIZADO' : 
                     'FALHA',
          Mensagem: item.processingError || "Sucesso"
      }));

      const ws = XLSX.utils.json_to_sheet(results);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resultados Importação");
      XLSX.writeFile(wb, `resultado_importacao_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} className="text-indigo-600" />
            Importação de Clientes em Lote
          </DialogTitle>
          <DialogDescription>
            Importe ou atualize Clientes via arquivo CSV seguindo o modelo padrão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
            {step === "upload" && (
                <div className="h-full flex flex-col items-center justify-center gap-6 py-10">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full max-w-md h-64 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                        <div className="p-4 rounded-full bg-indigo-50 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div className="text-center px-4">
                            <p className="font-medium text-slate-700 dark:text-slate-200">Clique para selecionar o arquivo CSV</p>
                            <p className="text-sm text-slate-500 mt-1">O arquivo deve estar no formato padrão (.csv)</p>
                        </div>
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-slate-500">Ainda não tem o modelo?</p>
                        <Button variant="outline" size="sm" onClick={handleDownloadModel} className="gap-2">
                            <Download size={14} />
                            Baixar Modelo CSV
                        </Button>
                    </div>
                </div>
            )}

            {step === "preview" && (
                <div className="flex flex-col h-full gap-4">
                    {previewMutation.isPending ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
                             <Loader2 size={32} className="animate-spin text-indigo-600" />
                             <p>Analisando arquivo...</p>
                        </div>
                    ) : previewMutation.data ? (
                        <>
                            <div className="grid grid-cols-3 gap-4 cursor-pointer">
                                <div 
                                    onClick={() => setFilter('new')}
                                    className={`border p-3 rounded-lg flex items-center gap-3 transition-colors ${filter === 'new' ? 'bg-green-100 border-green-300 ring-2 ring-green-500 ring-offset-1' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}
                                >
                                    <div className="bg-green-200 text-green-700 p-2 rounded-full"><CheckCircle2 size={18}/></div>
                                    <div>
                                        <p className="text-xs text-green-700 font-medium uppercase">Novos Registros</p>
                                        <p className="text-2xl font-bold text-green-800">{previewMutation.data.summary.new}</p>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setFilter('update')}
                                    className={`border p-3 rounded-lg flex items-center gap-3 transition-colors ${filter === 'update' ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-500 ring-offset-1' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'}`}
                                >
                                    <div className="bg-amber-200 text-amber-700 p-2 rounded-full"><AlertTriangle size={18}/></div>
                                    <div>
                                        <p className="text-xs text-amber-700 font-medium uppercase">Atualizações</p>
                                        <p className="text-2xl font-bold text-amber-800">{previewMutation.data.summary.update}</p>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setFilter('error')}
                                    className={`border p-3 rounded-lg flex items-center gap-3 transition-colors ${filter === 'error' ? 'bg-red-100 border-red-300 ring-2 ring-red-500 ring-offset-1' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <div className={`${filter === 'error' ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-700'} p-2 rounded-full`}><X size={18}/></div>
                                    <div>
                                        <p className={`text-xs font-medium uppercase ${filter === 'error' ? 'text-red-700' : 'text-slate-600'}`}>Erros</p>
                                        <p className={`text-2xl font-bold ${filter === 'error' ? 'text-red-800' : 'text-slate-700'}`}>{previewMutation.data.summary.error}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md flex-1 overflow-hidden flex flex-col min-h-0">
                                <div className="bg-slate-50 px-4 py-2 border-b text-xs font-semibold text-slate-500 flex justify-between items-center">
                                    <span>
                                        Pré-visualização: {filter === 'all' ? 'Todos' : filter === 'new' ? 'Novos' : filter === 'update' ? 'Atualizações' : 'Erros'} ({filteredRows.length} linhas)
                                    </span>
                                    {filter !== 'all' && (
                                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFilter('all')}>
                                            Ver Todos
                                        </Button>
                                    )}
                                </div>
                                <ScrollArea className="flex-1 h-full">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[100px]">Ação</TableHead>
                                                <TableHead>Matrícula</TableHead>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>CPF</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Digito da Conta</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRows.slice(0, 1000).map((row: any, idx: number) => (
                                                <TableRow key={idx} className={row.status === 'error' ? 'bg-red-50 hover:bg-red-100' : row.status === 'update' ? 'bg-amber-50/50 hover:bg-amber-100' : ''}>
                                                    <TableCell>
                                                        {row.status === 'new' && <Badge className="bg-green-600 hover:bg-green-700">Novo</Badge>}
                                                        {row.status === 'update' && <Badge className="bg-amber-600 hover:bg-amber-700">Atualizar</Badge>}
                                                        {row.status === 'error' && <Badge variant="destructive">Erro</Badge>}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-600">{row.data.registrationNumber}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={row.status === 'update' ? 'text-amber-700 font-medium' : 'text-slate-700 font-medium'}>{row.data.name}</span>
                                                            {row.status === 'update' && (
                                                                <span className="text-[10px] text-slate-400 line-through">Anterior: {row.originalName}</span>
                                                            )}
                                                            {row.errors.length > 0 && (
                                                                <span className="text-[11px] font-semibold text-red-600 mt-1 block">⚠ {row.errors.join(", ")}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-600">{row.data.document}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-600">{row.data.status}</TableCell>
                                                    <TableCell className="text-xs text-slate-600">{row.data.accountDigit || "-"}</TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredRows.length > 1000 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-slate-500 py-4 font-medium bg-slate-50">
                                                        ... e mais {filteredRows.length - 1000} linhas (use o filtro para ver detalhes)
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {filteredRows.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                                                        Nenhum registro encontrado neste filtro.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-red-500">
                            <AlertCircle size={32} />
                            <p>Erro ao ler arquivo. Tente novamente.</p>
                        </div>
                    )}
                </div>
            )}

            {step === "processing" && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 size={48} className="animate-spin text-indigo-600" />
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-slate-900">Processando Importação...</h3>
                        <p className="text-slate-500">Isso pode levar alguns instantes, por favor aguarde.</p>
                    </div>
                </div>
            )}

            {step === "results" && processMutation.data && (
                <div className="flex flex-col h-full gap-6 items-center justify-center p-8">
                     <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-2">
                             <Save size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Importação Concluída!</h2>
                        <p className="text-slate-500 text-center max-w-md">
                            O processo foi finalizado. Verifique o resumo abaixo e faça o download do relatório completo se necessário.
                        </p>
                     </div>

                     <div className="grid grid-cols-2 w-full max-w-lg gap-4">
                        <div className="bg-white border rounded-xl p-4 flex flex-col items-center shadow-sm">
                            <span className="text-3xl font-bold text-green-600">{processMutation.data.success}</span>
                            <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Sucessos</span>
                        </div>
                        <div className="bg-white border rounded-xl p-4 flex flex-col items-center shadow-sm">
                             <span className="text-3xl font-bold text-red-600">{processMutation.data.failed}</span>
                             <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Falhas</span>
                        </div>
                     </div>

                     <Button onClick={exportResults} variant="outline" className="gap-2 w-full max-w-xs mt-4">
                        <FileSpreadsheet size={16} />
                        Baixar Relatório de Erros/Sucessos
                     </Button>
                </div>
            )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
           {step === "upload" && (
               <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
           )}
           
           {step === "preview" && (
               <>
                  <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
                  <Button 
                    onClick={handleProcess} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    disabled={processMutation.isPending || (previewMutation.data?.summary.new === 0 && previewMutation.data?.summary.update === 0)}
                  >
                    Confirmar Importação
                    <ArrowRight size={16} />
                  </Button>
               </>
           )}

           {step === "results" && (
                <Button onClick={handleClose} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Fechar
                </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



