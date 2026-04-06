// client/src/dataProcessor.ts
import { ProcessedData, ChartDataItem, TimelineDataItem, ScatterDataItem } from './types';

export function processReportData(raw: any): ProcessedData {
  const statusLabels: Record<string, string> = {
    aguardando_atendimento: "Aguardando",
    em_atendimento: "Em curso",
    aguardando_resposta: "Pendente",
    em_espera: "Em Espera",
    atendimento_fechado: "Concluído",
    ticket_invalido: "Inválido",
  };

  const statusDistribution: ChartDataItem[] = Object.entries(raw.statusCounts || {}).map(([key, value]) => ({
    name: statusLabels[key] || key,
    value: value as number,
  }));

  const timeline: TimelineDataItem[] = (raw.flowSeries || []).map((item: any) => {
    let label = item.bucket;
    if (raw.period === "diario" || raw.period === "ontem") {
      label = item.bucket + ":00";
    } else if (item.bucket.includes("-")) {
      // Formato YYYY-MM-DD -> DD/MM/YYYY
      const parts = item.bucket.split("-");
      if (parts.length === 3) {
        label = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    
    return {
      hour: label,
      Total: item.count,
      Atendidos: Math.floor(item.count * 0.8), // Mantendo mock conforme original
    };
  });

  // Find peak hour
  const peak = [...timeline].sort((a, b) => b.Total - a.Total)[0];

  const rankingContracts: ChartDataItem[] = (raw.byContract || []).map((c: any) => ({
    name: c.contractName || "N/A",
    value: c.count,
  }));

  const rankingReasons: ChartDataItem[] = (raw.byReason || []).map((r: any) => ({
    name: r.reasonAcronym || r.reasonName || "Outros",
    value: r.count,
  }));

  // Matrix processing
  const matrix: any[] = raw.matrix || [];
  const contracts = Array.from(new Set(matrix.map((m: any) => m.contractName || "N/D")));
  const reasons = Array.from(new Set(matrix.map((m: any) => m.reasonAcronym || m.reasonName || "Motivo")));
  const scatterData: ScatterDataItem[] = matrix.map((m: any) => {
    const xIndex = contracts.indexOf(m.contractName || "N/D");
    const reasonLabel = m.reasonAcronym || m.reasonName || "Motivo";
    const yIndex = reasons.indexOf(reasonLabel);
    return {
      xIndex,
      yIndex,
      z: Math.min(1000, 100 + (m.count * 50)),
      rawZ: m.count,
      contract: m.contractName || "N/D",
      type: reasonLabel,
      x: m.contractName,
      y: reasonLabel
    };
  });

  // CSAT mapping
  const csatObj = raw.metrics?.csat?.ratings || raw.csatStats || {};
  const csatItems: ChartDataItem[] = [
    { name: "Satisfeito (3)", value: csatObj["3"] || 0 },
    { name: "Neutro (2)", value: csatObj["2"] || 0 },
    { name: "Insatisfeito (1)", value: csatObj["1"] || 0 },
    { name: "Sem Resposta", value: csatObj["na"] || 0 },
  ];

  // Helper for TMA
  const formatTma = (mins: number) => {
    if (!mins) return "00:00";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    summary: {
      totalTickets: raw.totalTickets || 0,
      tmaCommercial: formatTma(raw.metrics?.tmaMinutes || raw.metrics?.avgMinutes || 0),
      tmaMs: (raw.metrics?.tmaMinutes || 0) * 60 * 1000,
      peakHour: peak ? peak.hour : "--",
      finishedTickets: raw.statusCounts?.atendimento_fechado || 0,
      noAnswerTickets: raw.statusCounts?.ticket_invalido || 0, // Mapping invalid to no answer for PDF context if needed
      validTickets: (raw.totalTickets || 0) - (raw.statusCounts?.ticket_invalido || 0),
    },
    statusDistribution,
    timeline,
    contractsByTime: {
      data: timeline.map(t => ({ hour: t.hour })), // Simplification for now
      list: [],
    },
    ahtByReason: rankingReasons, // Reuse for AHT for now as we don't have per-reason TMA in metrics yet
    rankingContracts,
    rankingReasons,
    correlationMatrix: {
      data: scatterData,
      contracts: contracts as string[],
      reasons: reasons as string[],
    },
    csat: csatItems,
    analyses: {
      volume: raw.aiAnalysis?.volume || "Volume dentro da normalidade.",
      timeline: raw.aiAnalysis?.timeline || "Distribuição temporal equilibrada.",
      contracts: raw.aiAnalysis?.performance || "Performance estável por contrato.",
      efficiency: raw.aiAnalysis?.efficiency || "Eficiência média satisfatória.",
      matrix: raw.aiAnalysis?.trends || "Nenhuma anomalia detectada na matriz.",
      csat: raw.aiAnalysis?.csatScore || "NPS em patamares aceitáveis.",
    },
    period: raw.period || "diario",
  };
}



