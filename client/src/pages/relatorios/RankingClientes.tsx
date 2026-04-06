import React from "react";
import { Layout } from "@/components/Layout";
import { Users } from "lucide-react";
import { RankingViewer } from "@/components/RankingViewer";

export default function RankingClientes() {
  return (
    <Layout>
      <RankingViewer 
        type="Cliente"
        title="Ranking de Clientes"
        subtitle="Membros com maior volume de solicitações no Help Desk."
        icon={Users}
        color="bg-emerald-500"
      />
    </Layout>
  );
}



