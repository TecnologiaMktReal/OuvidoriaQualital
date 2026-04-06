
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, AlertTriangle, AlertCircle, Loader2, ArrowRight, Save, X, FileSpreadsheet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';

interface ContractImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ImportStep = "upload" | "preview" | "processing" | "results";

export function ContractImportModal({ open, onOpenChange, onSuccess }: ContractImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries e Mutations - Adaptado para Contracts
  const { refetch: generateModel } = trpc.contracts.generateImportModel.useQuery(undefined, { 
    enabled: false,
    retry: false
  });

  const previewMutation = trpc.contracts.previewImport.useMutation();
  const processMutation = trpc.contracts.processImport.useMutation();

  const handleDownloadModel = async () => {
    try {
      const { data } = await generateModel();
      if (!data) return;
      
      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "modelo_importacao_contratos.csv";
      link.click();
      toast.success("Modelo baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar modelo.");
    }
  };

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

  const handleProcess = async () => {
    if (!previewMutation.data) return;
    
    setStep("processing");
    try {
        await processMutation.mutateAsync({ rows: previewMutation.data.rows });
        setStep("results");
        onSuccess(); // Trigger refresh on parent
    } catch (error) {
        toast.error("Erro ao processar importação.");
    }
  };

  const handleClose = () => {
     onOpenChange(false);
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
          Nome: item.data.name,
          Cidade: item.data.city,
          Estado: item.data.state,
          Status: item.status === 'new' ? 'Novo' : item.status === 'update' ? 'Atualização' : 'Erro',
          Resultado: item.processingStatus === 'created' ? 'CRIADO' : 
                     item.processingStatus === 'updated' ? 'ATUALIZADO' : 
                     'FALHA',
          Mensagem: item.processingError || "Sucesso"
      }));

      const ws = XLSX.utils.json_to_sheet(results);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resultados Importação");
      XLSX.writeFile(wb, `resultado_importacao_contratos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} className="text-indigo-600" />
            Importação de Contratos em Lote
          </DialogTitle>
          <DialogDescription>
            Importe ou atualize contratos via arquivo CSV seguindo o modelo padrão.
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
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-3 rounded-lg flex items-center gap-3">
                                    <div className="bg-green-100 text-green-700 p-2 rounded-full"><CheckCircle2 size={18}/></div>
                                    <div>
                                        <p className="text-xs text-green-600 font-medium uppercase">Novos Registros</p>
                                        <p className="text-2xl font-bold text-green-700">{previewMutation.data.summary.new}</p>
                                    </div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 p-3 rounded-lg flex items-center gap-3">
                                    <div className="bg-red-100 text-red-700 p-2 rounded-full"><AlertTriangle size={18}/></div>
                                    <div>
                                        <p className="text-xs text-red-600 font-medium uppercase">Atualizações</p>
                                        <p className="text-2xl font-bold text-red-700">{previewMutation.data.summary.update}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex items-center gap-3">
                                    <div className="bg-slate-200 text-slate-700 p-2 rounded-full"><X size={18}/></div>
                                    <div>
                                        <p className="text-xs text-slate-600 font-medium uppercase">Erros</p>
                                        <p className="text-2xl font-bold text-slate-700">{previewMutation.data.summary.error}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md flex-1 overflow-hidden flex flex-col">
                                <div className="bg-slate-50 px-4 py-2 border-b text-xs font-semibold text-slate-500">
                                    Pré-visualização dos dados ({previewMutation.data.rows.length} linhas)
                                </div>
                                <ScrollArea className="flex-1">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Ação</TableHead>
                                                <TableHead>Nome da Entidade</TableHead>
                                                <TableHead>Cidade/UF</TableHead>
                                                <TableHead>Coordenador</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewMutation.data.rows.slice(0, 100).map((row: any, idx: number) => (
                                                <TableRow key={idx} className={row.status === 'error' ? 'bg-slate-100' : row.status === 'update' ? 'bg-red-50/50' : ''}>
                                                    <TableCell>
                                                        {row.status === 'new' && <Badge className="bg-green-600">Novo</Badge>}
                                                        {row.status === 'update' && <Badge className="bg-red-600">Atualizar</Badge>}
                                                        {row.status === 'error' && <Badge variant="secondary">Erro</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={row.status === 'update' ? 'text-red-700 font-medium' : ''}>{row.data.name}</span>
                                                            {row.status === 'update' && (
                                                                <span className="text-[10px] text-slate-400 line-through">{row.originalName}</span>
                                                            )}
                                                            {row.errors.length > 0 && (
                                                                <span className="text-[10px] text-red-600 mt-1">{row.errors.join(", ")}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{row.data.city}/{row.data.state}</TableCell>
                                                    <TableCell className="text-xs">{row.data.coordinatorName || "-"}</TableCell>
                                                    <TableCell className="text-xs">{row.data.status}</TableCell>
                                                </TableRow>
                                            ))}
                                            {previewMutation.data.rows.length > 100 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-slate-500 py-4">
                                                        ... e mais {previewMutation.data.rows.length - 100} linhas
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



