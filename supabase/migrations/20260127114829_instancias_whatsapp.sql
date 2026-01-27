-- Tabela de instâncias WhatsApp
CREATE TABLE IF NOT EXISTS public.instancias_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'desconectada' CHECK (status IN ('criada', 'conectada', 'desconectada', 'erro')),
  qrcode TEXT,
  resposta_criacao JSONB,
  resposta_conexao JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

COMMENT ON TABLE public.instancias_whatsapp IS 'Instâncias WhatsApp configuradas no sistema';
COMMENT ON COLUMN public.instancias_whatsapp.token IS 'Token da instância retornado pelo webhook';
COMMENT ON COLUMN public.instancias_whatsapp.status IS 'Status da instância: criada, conectada, desconectada, erro';
COMMENT ON COLUMN public.instancias_whatsapp.qrcode IS 'QR Code para conectar (se disponível)';
COMMENT ON COLUMN public.instancias_whatsapp.resposta_criacao IS 'Resposta completa do webhook de criação';
COMMENT ON COLUMN public.instancias_whatsapp.resposta_conexao IS 'Resposta completa do webhook de conexão';

-- Índices
CREATE INDEX IF NOT EXISTS idx_instancias_whatsapp_status ON public.instancias_whatsapp(status);
CREATE INDEX IF NOT EXISTS idx_instancias_whatsapp_token ON public.instancias_whatsapp(token);

-- RLS
ALTER TABLE public.instancias_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage instancias_whatsapp"
  ON public.instancias_whatsapp FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view instancias_whatsapp"
  ON public.instancias_whatsapp FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_instancias_whatsapp_updated_at
  BEFORE UPDATE ON public.instancias_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
