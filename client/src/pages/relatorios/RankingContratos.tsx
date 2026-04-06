import React from "react";
import { Layout } from "@/components/Layout";
import { FileText } from "lucide-react";
import { RankingViewer } from "@/components/RankingViewer";

export default function RankingContratos() {
  return (
    <Layout>
      <RankingViewer 
        type="contrato"
        title="Ranking de Contratos"
        subtitle="Contratos com maior sinistralidade e volume de atendimento."
        icon={FileText}
        color="bg-blue-500"
      />
    </Layout>
  );
}



