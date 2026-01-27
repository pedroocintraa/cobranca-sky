import { ConfigurarWebhooks } from '@/components/cobranca/ConfigurarWebhooks';
import { GerenciarInstancia } from '@/components/cobranca/GerenciarInstancia';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Webhook, Smartphone } from 'lucide-react';

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configure webhooks e instâncias WhatsApp</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="instancias" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Instâncias WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* Tab: Webhooks */}
        <TabsContent value="webhooks" className="space-y-6">
          <ConfigurarWebhooks />
        </TabsContent>

        {/* Tab: Instâncias */}
        <TabsContent value="instancias" className="space-y-6">
          <GerenciarInstancia />
        </TabsContent>
      </Tabs>
    </div>
  );
}
