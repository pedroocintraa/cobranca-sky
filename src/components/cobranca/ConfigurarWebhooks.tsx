import { useState, useEffect } from 'react';
import { Webhook, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfiguracaoWebhooks, useSaveConfiguracaoWebhooks } from '@/hooks/useWebhooks';
import { Skeleton } from '@/components/ui/skeleton';

export function ConfigurarWebhooks() {
  const { data: config, isLoading } = useConfiguracaoWebhooks();
  const saveConfig = useSaveConfiguracaoWebhooks();

  const [webhookDisparo, setWebhookDisparo] = useState('');
  const [webhookCriarInstancia, setWebhookCriarInstancia] = useState('');
  const [webhookConectarInstancia, setWebhookConectarInstancia] = useState('');

  useEffect(() => {
    if (config) {
      setWebhookDisparo(config.webhook_disparo || '');
      setWebhookCriarInstancia(config.webhook_criar_instancia || '');
      setWebhookConectarInstancia(config.webhook_conectar_instancia || '');
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate({
      webhook_disparo: webhookDisparo || null,
      webhook_criar_instancia: webhookCriarInstancia || null,
      webhook_conectar_instancia: webhookConectarInstancia || null,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Configurar Webhooks
        </CardTitle>
        <CardDescription>
          Configure as URLs dos webhooks para integração com o sistema de cobrança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="webhook-disparo">Webhook de Disparo</Label>
          <Input
            id="webhook-disparo"
            type="url"
            placeholder="https://exemplo.com/webhook/disparo"
            value={webhookDisparo}
            onChange={(e) => setWebhookDisparo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL do webhook que receberá os dados do cliente para disparar cobranças
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-criar">Webhook de Criar Instância</Label>
          <Input
            id="webhook-criar"
            type="url"
            placeholder="https://exemplo.com/webhook/criar-instancia"
            value={webhookCriarInstancia}
            onChange={(e) => setWebhookCriarInstancia(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL do webhook para criar nova instância WhatsApp
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-conectar">Webhook de Conectar Instância</Label>
          <Input
            id="webhook-conectar"
            type="url"
            placeholder="https://exemplo.com/webhook/conectar-instancia"
            value={webhookConectarInstancia}
            onChange={(e) => setWebhookConectarInstancia(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL do webhook para conectar instância WhatsApp existente
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveConfig.isPending}
            className="gap-2"
          >
            {saveConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
