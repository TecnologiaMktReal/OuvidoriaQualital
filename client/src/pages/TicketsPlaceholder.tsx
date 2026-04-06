import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";

export default function TicketsPlaceholder() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Gerencie os tickets de atendimento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5" />
              Gestão de Tickets
            </CardTitle>
            <CardDescription>
              Visualize, crie e gerencie tickets de atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



