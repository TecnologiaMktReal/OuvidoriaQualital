// client/src/types.ts

export interface ChartDataItem {
  name: string;
  value: number;
}

export interface TimelineDataItem {
  hour: string;
  Total: number;
  Atendidos: number;
}

export interface ContractTimeDataItem {
  hour: string;
  [contract: string]: number | string;
}

export interface ScatterDataItem {
  x: string;
  y: string;
  z: number;
  rawZ: number;
  contract: string;
  type: string;
  xIndex: number;
  yIndex: number;
}

export interface ProcessedData {
  summary: {
    totalTickets: number;
    tmaCommercial: string;
    tmaMs: number;
    peakHour: string;
    finishedTickets: number;
    noAnswerTickets: number;
    validTickets: number;
  };
  statusDistribution: ChartDataItem[];
  timeline: TimelineDataItem[];
  contractsByTime: {
    data: ContractTimeDataItem[];
    list: string[];
  };
  ahtByReason: ChartDataItem[];
  rankingContracts: ChartDataItem[];
  rankingReasons: ChartDataItem[];
  correlationMatrix: {
    data: ScatterDataItem[];
    contracts: string[];
    reasons: string[];
  };
  csat: ChartDataItem[];
  analyses: {
    volume: string;
    timeline: string;
    contracts: string;
    efficiency: string;
    matrix: string;
    csat: string;
  };
  period: string;
}



