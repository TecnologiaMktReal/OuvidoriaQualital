import React from "react";
import { Layout } from "@/components/Layout";
import { ListTree } from "lucide-react";
import { RankingViewer } from "@/components/RankingViewer";

export default function RankingTipos() {
  return (
    <Layout>
      <RankingViewer 
        type="tipo"
        title="Ranking por Motivo"
        subtitle="Analise os tipos de chamados mais recorrentes no período."
        icon={ListTree}
        color="bg-orange-500"
      />
    </Layout>
  );
}



