import React from "react";
import { Layout } from "@/components/Layout";
import { UserCheck } from "lucide-react";
import { RankingViewer } from "@/components/RankingViewer";

export default function RankingCoordenadores() {
  return (
    <Layout>
      <RankingViewer 
        type="coordenador"
        title="Ranking de Coordenadores"
        subtitle="Coordenações com maior fluxo de chamados processados."
        icon={UserCheck}
        color="bg-indigo-500"
      />
    </Layout>
  );
}



