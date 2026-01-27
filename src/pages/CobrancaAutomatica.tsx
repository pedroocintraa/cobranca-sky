import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelatoriosTab } from '@/components/cobranca/RelatoriosTab';
import { ClientesAtrasados } from '@/components/cobranca/ClientesAtrasados';
import { GerenciarRegrasCobranca } from '@/components/cobranca/GerenciarRegrasCobranca';
import { FilasCobranca } from '@/components/cobranca/FilasCobranca';
import { Users, Scale, List, BarChart3 } from 'lucide-react';

export default function CobrancaAutomatica() {

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cobrança Automática</h1>
          <p className="text-muted-foreground">Gerencie seus disparos de cobrança via WhatsApp</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes Atrasados
          </TabsTrigger>
          <TabsTrigger value="regras" className="gap-2">
            <Scale className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="filas" className="gap-2">
            <List className="h-4 w-4" />
            Filas
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Clientes Atrasados */}
        <TabsContent value="clientes" className="space-y-6">
          <ClientesAtrasados />
        </TabsContent>

        {/* Tab: Regras */}
        <TabsContent value="regras" className="space-y-6">
          <GerenciarRegrasCobranca />
        </TabsContent>

        {/* Tab: Filas */}
        <TabsContent value="filas" className="space-y-6">
          <FilasCobranca />
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="relatorios">
          <RelatoriosTab />
        </TabsContent>
      </Tabs>

    </div>
  );
}
