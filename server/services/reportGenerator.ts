import { generateDailyReportHtml, DailyReportData } from "../reports/dailyReport";
import { generatePeriodicReportHtml } from "../reports/periodicReport";
import { generatePeriodicReportAnalysis } from "./aiAnalysis";
import * as db from "../db";

export async function generateReportDataAndHtml(reportType: string, period: string) {
  let dateFrom: Date = new Date();
  let dateTo: Date = new Date();
  const now = new Date();

  // Resolve periods
  if (period === "ontem") {
    dateFrom = new Date(now);
    dateFrom.setDate(now.getDate() - 1);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(dateFrom);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "hoje") {
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "semana_atual") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    dateFrom.setDate(diff);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "mes_atual") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  } else if (period === "ano_atual") {
    dateFrom = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  }

  const metrics = await db.getPeriodicReportMetrics({
    period: reportType.replace("resumo_", "") as any,
    dateFrom,
    dateTo,
  });

  if (!metrics) throw new Error("Métricas não encontradas");

  const aiAnalysis = await generatePeriodicReportAnalysis(metrics);

  // Choose template
  if (reportType === "resumo_diario") {
     // Map statusCounts record to array for daily report
     const statusCountsArr = Object.entries(metrics.statusCounts).map(([name, value]) => ({
        name,
        value,
        color: name === "concluido" ? "#10b981" : name === "em_atendimento" ? "#2563eb" : "#f59e0b"
     }));

     // Peak hour from flowSeries
     const peakBucket = [...metrics.flowSeries].sort((a, b) => b.count - a.count)[0]?.bucket || "08:00";

     // Daily report expects a specific object structure
     const dailyData: DailyReportData = {
        date: dateFrom.toLocaleDateString("pt-BR"),
        generatedAt: new Date().toLocaleString("pt-BR"),
        totalTickets: metrics.totalTickets,
        closedTickets: metrics.statusCounts["concluido"] || 0,
        waitingTickets: metrics.statusCounts["aguardando_atendimento"] || 0,
        validTickets: metrics.totalTickets,
        avgTmaMs: (metrics.metrics.tmaMinutes || 0) * 60 * 1000,
        peakHour: peakBucket + ":00",
        statusCounts: statusCountsArr,
        hourSeries: metrics.flowSeries.map(f => ({ hour: f.bucket, total: f.count, closed: 0 })), // Simplified
        byContract: metrics.byContract.map(c => ({ name: c.contractName || "Desconhecido", value: c.count })),
        tmaByReason: metrics.byReason.map(r => ({ name: r.reasonName || "Outros", value: r.count })),
        attendedByContract: metrics.byContract.map(c => ({ name: c.contractName || "Desconhecido", value: c.count })),
        attendedByReason: metrics.byReason.map(r => ({ name: r.reasonName || "Outros", value: r.count })),
        matrixTipoContrato: metrics.matrix.map(m => ({ 
           reason: m.reasonName || "Outros", 
           contract: m.contractName || "Desconhecido", 
           value: m.count 
        })),
        csat: {
           total: metrics.metrics.csat.total,
           dist: {
              excelente: metrics.metrics.csat.ratings.excellent || 0,
              bom: metrics.metrics.csat.ratings.good || 0,
              ruim: metrics.metrics.csat.ratings.bad || 0,
              na: metrics.metrics.csat.ratings.na || 0
           }
        },
        analyses: aiAnalysis as any
     };
     return generateDailyReportHtml(dailyData);
  } else {
     // Periodic report expects something else but we'll try to adapt
     return generatePeriodicReportHtml({
        ...metrics,
        aiAnalysis,
        // Adapt fields if needed for periodic template
        csat: {
           total: metrics.metrics.csat.total,
           dist: {
              excelente: metrics.metrics.csat.ratings.excellent || 0,
              bom: metrics.metrics.csat.ratings.good || 0,
              ruim: metrics.metrics.csat.ratings.bad || 0,
              na: metrics.metrics.csat.ratings.na || 0
           }
        }
     } as any);
  }
}



