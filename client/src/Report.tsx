// client/src/Report.tsx
import React from 'react';
import { logos, COLORS } from './constants';
import { Card, Title, Text, Metric, Grid, AnalysisBox } from './components';
import { 
  StatusPieChart, 
  TimelineChart, 
  AHTBarChart, 
  RankingBarChart, 
  CorrelationMatrixChart, 
  CSATChart,
  FlowBarChart
} from './charts';
import { ProcessedData } from './types';

// ============================================================
// CAPA (Pagina Principal)
// ============================================================
const CoverPage: React.FC<{ date: string; title: string }> = ({ date, title }) => (
  <div className="pdf-page w-[297mm] h-[209mm] bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden page-break-after">
    {/* Background decorativo */}
    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
    
    {/* Logo */}
    <img src={logos.blue} alt="Logo Qualital" className="h-24 mb-12" crossOrigin="anonymous" />
    
    {/* Titulo Principal */}
    <div className="text-center">
      <p className="text-blue-400 text-sm font-bold uppercase tracking-[0.5em] mb-4">Help Desk Qualital</p>
      <h1 className="text-white text-5xl font-black uppercase tracking-tight leading-none mb-6">
        {title}<br />de Atendimento
      </h1>
      <div className="w-32 h-1.5 bg-blue-500 mx-auto rounded-full" />
    </div>
    
    {/* Card com Dados */}
    <div className="mt-16 flex gap-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl px-12 py-6 text-center">
        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Departamento</p>
        <p className="text-white text-xl font-bold uppercase">Help Desk Corporativo</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl px-12 py-6 text-center">
        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Data Base</p>
        <p className="text-white text-xl font-bold uppercase">{date}</p>
      </div>
    </div>
    
    {/* Rodape */}
    <p className="absolute bottom-8 text-white/20 text-xs font-bold uppercase tracking-[0.4em]">
      Confidencial • Uso Interno • 2025
    </p>
  </div>
);

// ============================================================
// TEMPLATE DE PAGINA INTERNA
// ============================================================
interface PageTemplateProps {
  title: string;
  date: string;
  pageNum: number;
  children: React.ReactNode;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ title, date, pageNum, children }) => (
  <div className="pdf-page w-[297mm] h-[209mm] bg-white p-8 flex flex-col relative page-break-after">
    {/* Cabecalho */}
    <div className="flex justify-between items-center pb-4 mb-6 border-b-2 border-slate-100">
      <img src={logos.blue} alt="Logo" className="h-10 brightness-0" crossOrigin="anonymous" />
      <div className="text-right">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500">Data Base: {date}</p>
      </div>
    </div>
    
    {/* Conteudo */}
    <div className="flex-1 min-h-0">
      {children}
    </div>
    
    {/* Rodape */}
    <div className="flex justify-between items-center pt-4 mt-6 border-t border-slate-100">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Confidencial • Uso Interno • HDC v2.0</p>
      <p className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Página {pageNum}</p>
    </div>
  </div>
);

// ============================================================
// COMPONENTE PRINCIPAL DO RELATORIO
// ============================================================
export const Report: React.FC<{ data: ProcessedData; date: string; title: string }> = ({ data, date, title }) => {
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pdf-container">
      {/* CAPA */}
      <CoverPage date={date} title={title} />

      {/* PAGINA 1: Visao Geral & KPIs */}
      <PageTemplate title="Visão Geral & KPIs" date={date} pageNum={1}>
        <Grid numItems={3} className="mb-6">
          <Card>
            <Title>Total de Tickets</Title>
            <Metric color="blue">{data.summary.totalTickets}</Metric>
            <Text className="mt-2">Volume total de chamados</Text>
          </Card>
          <Card>
            <Title>TMA (Comercial)</Title>
            <Metric color="indigo">{data.summary.tmaCommercial}</Metric>
            <Text className="mt-2">Tempo médio de atendimento</Text>
          </Card>
          <Card>
            <Title>Horário de Pico</Title>
            <Metric color="purple">{data.summary.peakHour}</Metric>
            <Text className="mt-2">Maior concentração</Text>
          </Card>
          <Card>
            <Title>Atend. Finalizado</Title>
            <Metric color="green">{data.summary.finishedTickets}</Metric>
            <Text className="mt-2">Concluídos no período</Text>
          </Card>
          <Card>
            <Title>Sem Resposta</Title>
            <Metric color="gray">{data.summary.noAnswerTickets || 0}</Metric>
            <Text className="mt-2">Aguardando retorno</Text>
          </Card>
          <Card>
            <Title>Tickets Válidos</Title>
            <Metric color="blue">{data.summary.validTickets}</Metric>
            <Text className="mt-2">Para cálculo de SLA</Text>
          </Card>
        </Grid>

        <div className="flex gap-6 h-[90mm]">
          <Card className="flex-1">
            <Title>Distribuição por Status</Title>
            <div className="h-full">
              <StatusPieChart data={data.statusDistribution} />
            </div>
          </Card>
          <div className="w-[140mm] flex flex-col gap-4">
            <AnalysisBox title="Análise de Volume" content={data.analyses.volume} variant="blue" />
            <AnalysisBox title="Plano de Ação" content="Manter monitoramento contínuo e escalar se necessário." variant="green" />
          </div>
        </div>
      </PageTemplate>

      {/* PAGINA 2: Evolucao Temporal */}
      <PageTemplate title="Evolução Temporal" date={date} pageNum={2}>
        <Card className="h-[120mm] mb-6">
          <Title>{data.period === "diario" || data.period === "ontem" ? "Volume por Hora" : "Fluxo de Atendimento"}</Title>
          <div className="h-full">
            {data.period === "diario" || data.period === "ontem" ? (
              <TimelineChart data={data.timeline} />
            ) : (
              <FlowBarChart data={data.timeline} />
            )}
          </div>
        </Card>
        <AnalysisBox title="Análise de Fluxo" content={data.analyses.timeline} variant="blue" />
      </PageTemplate>

      {/* PAGINA 3: Eficiencia & Rankings */}
      <PageTemplate title="Eficiência & Rankings" date={date} pageNum={3}>
        <div className="flex gap-6 mb-6 h-[60mm]">
          <Card className="flex-[2]">
            <Title>TMA por Motivo (Minutos)</Title>
            <div className="h-full">
              <AHTBarChart data={data.ahtByReason} formatDuration={formatDuration} />
            </div>
          </Card>
          <div className="flex-1">
            <AnalysisBox title="Eficiência Operacional" content={data.analyses.efficiency} variant="blue" />
          </div>
        </div>
        <div className="flex gap-6 h-[80mm]">
          <Card className="flex-1">
            <Title>Top 10 Contratos (Demanda)</Title>
            <div className="h-full">
              <RankingBarChart data={data.rankingContracts} />
            </div>
          </Card>
          <Card className="flex-1">
            <Title>Top 10 Motivos de Chamado</Title>
            <div className="h-full">
              <RankingBarChart data={data.rankingReasons} />
            </div>
          </Card>
        </div>
      </PageTemplate>

      {/* PAGINA 4: Matriz de Correlacao */}
      <PageTemplate title="Matriz de Correlação" date={date} pageNum={4}>
        <Card className="h-[130mm] mb-6">
          <Title>Correlação Contrato x Motivo</Title>
          <div className="h-full">
            <CorrelationMatrixChart 
              data={data.correlationMatrix.data} 
              contractCats={data.correlationMatrix.contracts} 
              typeCats={data.correlationMatrix.reasons} 
            />
          </div>
        </Card>
        <AnalysisBox title="Análise da Matriz" content={data.analyses.matrix} variant="yellow" />
      </PageTemplate>

      {/* PAGINA 5: CSAT */}
      <PageTemplate title="CSAT - Satisfação do Cliente" date={date} pageNum={5}>
        <Card className="h-[100mm] mb-6">
          <Title>Percentual de Satisfação</Title>
          <div className="h-full">
            <CSATChart data={data.csat} />
          </div>
        </Card>
        <div className="flex gap-6">
          <AnalysisBox title="Eficiência do CSAT" content={data.analyses.csat} variant="blue" />
          <AnalysisBox title="Análise e Ações" content="Manter foco em resolução rápida e comunicação clara." variant="green" />
        </div>
      </PageTemplate>

      {/* PAGINA 6: Glossario */}
      <PageTemplate title="Glossário e Definições" date={date} pageNum={6}>
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <Title>Total de Tickets</Title>
            <Text>Volume total de chamados abertos no período analisado.</Text>
          </Card>
          <Card className="border-l-4 border-l-indigo-500">
            <Title>TMA (Tempo Médio de Atendimento)</Title>
            <Text>Média de tempo desde a abertura até a resolução, em horário comercial.</Text>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <Title>Horário de Pico</Title>
            <Text>Intervalo de 60 minutos com maior concentração de chamados.</Text>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <Title>CSAT (Satisfação)</Title>
            <Text>Customer Satisfaction Score - pesquisa de satisfação pós-atendimento.</Text>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <Title>Matriz de Correlação</Title>
            <Text>Cruzamento entre contratos e motivos de atendimento.</Text>
          </Card>
          <Card className="border-l-4 border-l-slate-400">
            <Title>Tickets Válidos</Title>
            <Text>Chamados que entram no cálculo de SLA, excluindo duplicidades.</Text>
          </Card>
        </div>
        
        <div className="mt-8 p-6 bg-slate-50 rounded-xl text-center">
          <p className="text-xs text-slate-500 italic">
            "Dados transformados em inteligência operacional para decisões estratégicas."
          </p>
        </div>
      </PageTemplate>
    </div>
  );
};



