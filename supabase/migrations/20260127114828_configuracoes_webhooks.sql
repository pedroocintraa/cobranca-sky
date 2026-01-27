-- Tabela de configurações de webhooks
CREATE TABLE IF NOT EXISTS public.configuracoes_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_disparo TEXT,
  webhook_criar_instancia TEXT,
  webhook_conectar_instancia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

COMMENT ON TABLE public.configuracoes_webhooks IS 'Configurações dos webhooks do sistema';
COMMENT ON COLUMN public.configuracoes_webhooks.webhook_disparo IS 'URL do webhook para disparar cobranças';
COMMENT ON COLUMN public.configuracoes_webhooks.webhook_criar_instancia IS 'URL do webhook para criar instância WhatsApp';
COMMENT ON COLUMN public.configuracoes_webhooks.webhook_conectar_instancia IS 'URL do webhook para conectar instância WhatsApp';

-- RLS
ALTER TABLE public.configuracoes_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage configuracoes_webhooks"
  ON public.configuracoes_webhooks FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view configuracoes_webhooks"
  ON public.configuracoes_webhooks FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_webhooks_updated_at
  BEFORE UPDATE ON public.configuracoes_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro padrão (vazio)
INSERT INTO public.configuracoes_webhooks (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;
