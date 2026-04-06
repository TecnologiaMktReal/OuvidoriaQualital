// client/src/pages/ReportPDF.tsx
import React, { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { trpc } from '@/lib/trpc';
import { Report } from '@/Report';
import { processReportData } from '@/dataProcessor';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReportPDF() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const period = (searchParams.get('period') || 'diario') as any;
  const dateStr = searchParams.get('date') || new Date().toISOString();
  
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: rawData, isLoading } = trpc.reports.getPeriodicMetrics.useQuery({
    period,
    date: new Date(dateStr),
    withAiAnalysis: true
  });

  const processedData = React.useMemo(() => rawData ? processReportData(rawData) : null, [rawData]);
  
  const { periodLabel, reportTitle } = React.useMemo(() => {
    const referenceDate = new Date(dateStr);
    
    // Titulo dinâmico para a capa
    const titles: Record<string, string> = {
      diario: 'Relatório Diário',
      ontem: 'Relatório Diário',
      semanal: 'Relatório Semanal',
      mensal: 'Relatório Mensal',
      anual: 'Relatório Anual'
    };
    
    // Label de período para a "Data Base"
    let label = '';
    if (period === 'diario' || period === 'ontem') {
      const d = period === 'ontem' ? addDays(referenceDate, -1) : referenceDate;
      label = format(d, 'dd/MM/yyyy');
    } else if (period === 'semanal') {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      label = `Semanal ${format(start, 'dd/MM/yyyy')} à ${format(end, 'dd/MM/yyyy')}`;
    } else if (period === 'mensal') {
      const monthYear = format(referenceDate, "MMMM/yyyy", { locale: ptBR });
      label = `Mensal: ${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}`;
    } else {
      label = `Anual: ${referenceDate.getFullYear()}`;
    }

    return {
      periodLabel: label,
      reportTitle: titles[period] || 'Relatório de Atendimento'
    };
  }, [period, dateStr]);

  // ============================================================
  // FUNCAO DE GERACAO DO PDF (com limpeza de cores OKLCH)
  // ============================================================
  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    setIsGenerating(true);
    const toastId = toast.loading("Gerando PDF...");

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pages = reportRef.current.querySelectorAll('.pdf-page');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        toast.loading(`Capturando página ${i + 1} de ${pages.length}...`, { id: toastId });

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 1123,
          height: 794,
          windowWidth: 1123,
          windowHeight: 794,
          onclone: (clonedDoc) => {
            // ==============================================
            // LIMPEZA DE CORES MODERNAS (OKLCH/OKLAB)
            // ==============================================
            
            // 1. Remove TODAS as stylesheets globais que podem conter oklch
            const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            stylesheets.forEach(s => s.remove());

            // 2. Injeta CSS seguro apenas com HEX
            const safeStyles = clonedDoc.createElement('style');
            safeStyles.textContent = `
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body {
                margin: 0;
                padding: 0;
                font-family: system-ui, -apple-system, sans-serif;
                background: #ffffff;
              }
              
              .pdf-page {
                width: 1123px !important;
                height: 794px !important;
                background: #ffffff !important;
                position: relative !important;
                overflow: hidden !important;
              }
              
              /* Cores de texto seguras */
              .text-slate-800 { color: #1e293b !important; }
              .text-slate-700 { color: #334155 !important; }
              .text-slate-600 { color: #475569 !important; }
              .text-slate-500 { color: #64748b !important; }
              .text-slate-400 { color: #94a3b8 !important; }
              .text-white { color: #ffffff !important; }
              .text-blue-600 { color: #2563eb !important; }
              .text-blue-500 { color: #3b82f6 !important; }
              .text-blue-400 { color: #60a5fa !important; }
              .text-emerald-600 { color: #059669 !important; }
              .text-emerald-900 { color: #064e3b !important; }
              .text-amber-600 { color: #d97706 !important; }
              .text-amber-900 { color: #78350f !important; }
              .text-red-600 { color: #dc2626 !important; }
              .text-purple-600 { color: #9333ea !important; }
              .text-indigo-600 { color: #4f46e5 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              
              /* Cores de fundo seguras */
              .bg-white { background-color: #ffffff !important; }
              .bg-slate-900 { background-color: #0f172a !important; }
              .bg-slate-200 { background-color: #e2e8f0 !important; }
              .bg-slate-100 { background-color: #f1f5f9 !important; }
              .bg-slate-50 { background-color: #f8fafc !important; }
              .bg-blue-50 { background-color: #eff6ff !important; }
              .bg-blue-500 { background-color: #3b82f6 !important; }
              .bg-blue-600 { background-color: #2563eb !important; }
              .bg-emerald-50 { background-color: #ecfdf5 !important; }
              .bg-emerald-500 { background-color: #10b981 !important; }
              .bg-amber-50 { background-color: #fffbeb !important; }
              .bg-amber-500 { background-color: #f59e0b !important; }
              .bg-red-500 { background-color: #ef4444 !important; }
              
              /* Bordas seguras */
              .border-slate-200 { border-color: #e2e8f0 !important; }
              .border-slate-100 { border-color: #f1f5f9 !important; }
              .border-blue-500 { border-color: #3b82f6 !important; }
              .border-emerald-500 { border-color: #10b981 !important; }
              .border-amber-500 { border-color: #f59e0b !important; }
              .border-l-blue-500 { border-left-color: #3b82f6 !important; }
              .border-l-indigo-500 { border-left-color: #6366f1 !important; }
              .border-l-purple-500 { border-left-color: #a855f7 !important; }
              .border-l-emerald-500 { border-left-color: #10b981 !important; }
              .border-l-amber-500 { border-left-color: #f59e0b !important; }
              .border-l-slate-400 { border-left-color: #94a3b8 !important; }
              
              /* Reset de sombras que podem usar oklab */
              .shadow-sm, .shadow, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
                box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
              }
              
              /* Layout helpers */
              .flex { display: flex !important; }
              .flex-col { flex-direction: column !important; }
              .flex-1 { flex: 1 1 0% !important; }
              .items-center { align-items: center !important; }
              .justify-between { justify-content: space-between !important; }
              .justify-center { justify-content: center !important; }
              .gap-3 { gap: 0.75rem !important; }
              .gap-4 { gap: 1rem !important; }
              .gap-6 { gap: 1.5rem !important; }
              .gap-8 { gap: 2rem !important; }
              .grid { display: grid !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              
              /* Spacing */
              .p-4 { padding: 1rem !important; }
              .p-5 { padding: 1.25rem !important; }
              .p-6 { padding: 1.5rem !important; }
              .p-8 { padding: 2rem !important; }
              .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
              .px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
              .px-12 { padding-left: 3rem !important; padding-right: 3rem !important; }
              .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
              .py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
              .pb-4 { padding-bottom: 1rem !important; }
              .pt-2 { padding-top: 0.5rem !important; }
              .pt-4 { padding-top: 1rem !important; }
              .mb-2 { margin-bottom: 0.5rem !important; }
              .mb-3 { margin-bottom: 0.75rem !important; }
              .mb-4 { margin-bottom: 1rem !important; }
              .mb-6 { margin-bottom: 1.5rem !important; }
              .mb-12 { margin-bottom: 3rem !important; }
              .mt-2 { margin-top: 0.5rem !important; }
              .mt-6 { margin-top: 1.5rem !important; }
              .mt-8 { margin-top: 2rem !important; }
              .mt-16 { margin-top: 4rem !important; }
              
              /* Typography */
              .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
              .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
              .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
              .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
              .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
              .text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
              .text-6xl { font-size: 3.75rem !important; line-height: 1 !important; }
              .font-medium { font-weight: 500 !important; }
              .font-bold { font-weight: 700 !important; }
              .font-black { font-weight: 900 !important; }
              .uppercase { text-transform: uppercase !important; }
              .italic { font-style: italic !important; }
              .leading-none { line-height: 1 !important; }
              .leading-relaxed { line-height: 1.625 !important; }
              .tracking-tight { letter-spacing: -0.025em !important; }
              .tracking-wide { letter-spacing: 0.025em !important; }
              .tracking-wider { letter-spacing: 0.05em !important; }
              .tracking-widest { letter-spacing: 0.1em !important; }
              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              
              /* Borders */
              .border { border-width: 1px !important; }
              .border-2 { border-width: 2px !important; }
              .border-l-4 { border-left-width: 4px !important; }
              .border-b-2 { border-bottom-width: 2px !important; }
              .border-t { border-top-width: 1px !important; }
              .rounded-lg { border-radius: 0.5rem !important; }
              .rounded-xl { border-radius: 0.75rem !important; }
              .rounded-2xl { border-radius: 1rem !important; }
              .rounded-full { border-radius: 9999px !important; }
              
              /* Sizes */
              .h-3 { height: 0.75rem !important; }
              .h-10 { height: 2.5rem !important; }
              .h-24 { height: 6rem !important; }
              .h-full { height: 100% !important; }
              .w-32 { width: 8rem !important; }
              .w-full { width: 100% !important; }
              .min-h-0 { min-height: 0 !important; }
              
              /* Positions */
              .relative { position: relative !important; }
              .absolute { position: absolute !important; }
              .inset-0 { inset: 0 !important; }
              .bottom-8 { bottom: 2rem !important; }
              
              /* Misc */
              .overflow-hidden { overflow: hidden !important; }
              .opacity-5 { opacity: 0.05 !important; }
              .opacity-80 { opacity: 0.8 !important; }
              .space-y-1 > * + * { margin-top: 0.25rem !important; }
              .space-y-4 > * + * { margin-top: 1rem !important; }
              .brightness-0 { filter: brightness(0) !important; }
            `;
            clonedDoc.head.appendChild(safeStyles);
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }

      const filename = `Relatorio_HDC_${period}_${periodLabel.replace(/\//g, '-').replace(/[: à]/g, '_')}.pdf`;
      pdf.save(filename);
      toast.success("PDF gerado com sucesso!", { id: toastId });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro na geração do PDF: " + (error as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium">Carregando dados do relatório...</p>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600 font-medium">Erro ao carregar dados.</p>
        <Button onClick={() => window.history.back()}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 pb-20">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 p-4 flex justify-between items-center no-print shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            // Navegar para a página correta baseado no período
            const periodRoutes: Record<string, string> = {
              diario: '/relatorios/resumo-diario',
              semanal: '/relatorios/resumo-semanal',
              mensal: '/relatorios/resumo-mensal',
              anual: '/relatorios/resumo-anual'
            };
            setLocation(periodRoutes[period] || '/relatorios/resumo-diario');
          }} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 uppercase">Visualizador de Relatório</h1>
            <p className="text-xs text-slate-500">{periodLabel}</p>
          </div>
        </div>
        
        <Button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
        >
          {isGenerating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Baixar PDF</>
          )}
        </Button>
      </div>

      <div className="flex justify-center py-10 overflow-x-auto">
        <div className="shadow-2xl origin-top scale-[0.6] md:scale-[0.75] lg:scale-[0.9]">
          <div ref={reportRef} className="pdf-mode bg-white">
            <Report data={processedData} date={periodLabel} title={reportTitle} />
          </div>
        </div>
      </div>

      <style>{`
        .pdf-page {
          width: 297mm;
          height: 210mm;
          overflow: hidden;
          box-sizing: border-box;
        }
        
        .pdf-mode {
          background: white;
        }
        
        .pdf-mode .pdf-page {
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin-bottom: 40px;
        }
        
        .pdf-mode .pdf-page:last-child {
          margin-bottom: 0;
        }
        
        .page-break-after {
          page-break-after: always;
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}



