import { invokeLLM } from "../_core/llm";
import { logger } from "../_core/logger";

export interface PeriodicReportData {
  period: string;
  totalTickets: number;
  statusCounts: Record<string, number>;
  byContract: Array<{ contractName: string | null; count: number }>;
  byReason: Array<{ reasonName: string | null; count: number }>;
  metrics: {
    tmaMinutes: number | null;
    csat: {
      total: number;
      ratings: Record<string, number>;
    };
  };
  flowSeries: Array<{ bucket: string; count: number }>;
  matrix: Array<{
    contractId: number | null;
    contractName: string | null;
    reasonId: number | null;
    reasonAcronym: string | null;
    reasonName: string | null;
    reasonColor: string | null;
    count: number;
  }>;
  totals?: {
    tickets: number;
    clientes: number;
    contracts: number;
  };
}

export async function generatePeriodicReportAnalysis(data: PeriodicReportData) {
  try {
    const systemPrompt = `Você é um Arquiteto de Software Sênior e Analista Operacional da Qualital. 
Sua tarefa é analisar os dados de atendimento (tickets de help desk) e fornecer comentários analíticos CRÍTICOS, INTELIGENTES e ACIONÁVEIS em Português BR.
Não seja apenas descritivo. Identifique gargalos, tendências preocupantes, e sugira melhorias.
Cada seção deve ter no máximo 3 frases curtas e impactantes.`;

    const userPrompt = `Analise os seguintes dados do relatório operacional (${data.period}):

DADOS GERAIS:
- Total de Tickets: ${data.totalTickets}
- TMA Médio: ${data.metrics.tmaMinutes ? Number(data.metrics.tmaMinutes).toFixed(1) + " min" : "N/A"}

STATUS:
${Object.entries(data.statusCounts).map(([s, c]) => `- ${s}: ${c}`).join("\n")}

TOP 5 CONTRATOS (Volume):
${data.byContract.slice(0, 5).map(c => `- ${c.contractName || "Sem Nome"}: ${c.count}`).join("\n")}

TOP 5 MOTIVOS DE ATENDIMENTO:
${data.byReason.slice(0, 5).map(r => `- ${r.reasonName || "Indefinido"}: ${r.count}`).join("\n")}

PESQUISA DE SATISFAÇÃO (CSAT):
- Total de Respostas: ${data.metrics.csat.total}
- Avaliações: ${JSON.stringify(data.metrics.csat.ratings)}

Retorne a análise em um formato JSON com as seguintes chaves:
{
  "volume": "Análise crítica sobre a quantidade de tickets e distribuição de status.",
  "performance": "Análise sobre o tempo médio de atendimento (TMA) e produtividade.",
  "trends": "Análise de tendências baseada nos motivos e contratos mais frequentes.",
  "csat": "Análise sobre a satisfação dos clientes e pontos de atenção.",
  "actionPlan": "Plano de ação sugerido (curto e direto)."
}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      responseFormat: { type: "json_object" }
    });

    const content = typeof result.choices[0].message.content === 'string' 
      ? JSON.parse(result.choices[0].message.content)
      : result.choices[0].message.content;
      
    return content;
  } catch (error) {
    logger.error("[AI Analysis] Failed to generate periodic analysis", { error: (error as Error)?.message });
    return {
      volume: "Falha ao gerar análise automática de volume.",
      performance: "Falha ao gerar análise automática de performance.",
      trends: "Falha ao gerar análise automática de tendências.",
      csat: "Falha ao gerar análise automática de satisfação.",
      actionPlan: "Aguardando recuperação do serviço de IA."
    };
  }
}



