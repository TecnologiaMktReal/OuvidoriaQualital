import { Layout } from "@/components/Layout";
import PeriodicReportViewer from "@/components/PeriodicReportViewer";

export default function ResumoSemanal() {
  return (
    <Layout>
      <PeriodicReportViewer 
        initialPeriod="semanal"
        fixedPeriodType="semanal"
        title="Resumo Semanal"
        subtitle="Análise consolidada da semana operacional"
      />
    </Layout>
  );
}



