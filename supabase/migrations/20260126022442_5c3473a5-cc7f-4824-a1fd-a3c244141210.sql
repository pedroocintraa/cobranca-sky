-- Tabela de configurações de cobrança para agendamento CRON
CREATE TABLE IF NOT EXISTS public.configuracoes_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_expression TEXT NOT NULL DEFAULT '0 8 * * 1-5',
  hora TEXT NOT NULL DEFAULT '08:00',
  dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  dias_atraso_minimo INTEGER NOT NULL DEFAULT 1,
  incluir_atrasados BOOLEAN NOT NULL DEFAULT true,
  incluir_pendentes BOOLEAN NOT NULL DEFAULT false,
  filtro_numero_fatura INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ativo BOOLEAN NOT NULL DEFAULT false,
  ultima_execucao TIMESTAMPTZ,
  proxima_execucao TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.configuracoes_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage configuracoes"
  ON public.configuracoes_cobranca FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view configuracoes"
  ON public.configuracoes_cobranca FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_cobranca_updated_at
  BEFORE UPDATE ON public.configuracoes_cobranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();