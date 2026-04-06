import { Layout } from "@/components/Layout";
import PeriodicReportViewer from "@/components/PeriodicReportViewer";

export default function ResumoMensal() {
  return (
    <Layout>
      <PeriodicReportViewer 
        initialPeriod="mensal"
        fixedPeriodType="mensal"
        title="Resumo Mensal"
        subtitle="Visão consolidada do desempenho mensal"
      />
    </Layout>
  );
}



