import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Construction } from "lucide-react";

export default function TiposAtendimentos() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tipos de Atendimentos</h1>
          <p className="text-muted-foreground">Configure os tipos e motivos de atendimento</p>
        </div>

        {/* Em Desenvolvimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Motivos de Atendimento
            </CardTitle>
            <CardDescription>
              Gerencie os tipos de atendimento e seus respectivos SLAs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
              <p className="text-muted-foreground max-w-md">
                Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



