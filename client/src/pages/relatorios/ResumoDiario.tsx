import { Layout } from "@/components/Layout";
import PeriodicReportViewer from "@/components/PeriodicReportViewer";

export default function ResumoDiario() {
  return (
    <Layout>
      <PeriodicReportViewer 
        initialPeriod="diario"
        fixedPeriodType="diario"
        title="Resumo Diário"
        subtitle="Métricas de performance operacional do dia"
      />
    </Layout>
  );
}



