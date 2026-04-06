import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Construction } from "lucide-react";

export default function APIs() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">APIs</h1>
          <p className="text-muted-foreground">Configure integrações e APIs externas</p>
        </div>

        {/* Em Desenvolvimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Integrações de APIs
            </CardTitle>
            <CardDescription>
              Gerencie as integrações com sistemas externos e APIs de terceiros
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



