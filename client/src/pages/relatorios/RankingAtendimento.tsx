import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function RankingAtendimento() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ranking Atendimento</h1>
          <p className="text-muted-foreground">Ranking por atendente/departamento</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5" />
              Em desenvolvimento
            </CardTitle>
            <CardDescription>Em breve você poderá ver o ranking de performance.</CardDescription>
          </CardHeader>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Esta tela será preenchida com ranking e comparativos.
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}




