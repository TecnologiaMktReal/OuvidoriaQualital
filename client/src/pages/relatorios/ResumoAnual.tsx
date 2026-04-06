import { Layout } from "@/components/Layout";
import PeriodicReportViewer from "@/components/PeriodicReportViewer";

export default function ResumoAnual() {
  return (
    <Layout>
      <PeriodicReportViewer 
        initialPeriod="anual"
        title="Resumo Anual"
        subtitle="Visão estratégica consolidada do ano vigente"
        fixedPeriodType="anual"
      />
    </Layout>
  );
}



