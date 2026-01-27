-- Tabela de histórico de cobranças realizadas
CREATE TABLE IF NOT EXISTS public.historico_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fila_critica BOOLEAN NOT NULL DEFAULT false,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'falha')),
  mensagem_enviada TEXT,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.historico_cobranca IS 'Histórico de todas as cobranças realizadas - evita duplicatas';
COMMENT ON COLUMN public.historico_cobranca.regra_id IS 'ID da regra usada (NULL se foi fila crítica)';
COMMENT ON COLUMN public.historico_cobranca.fila_critica IS 'Indica se veio da fila crítica (>15 dias)';
COMMENT ON COLUMN public.historico_cobranca.data_envio IS 'Data/hora em que a cobrança foi enviada';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_cobranca_fatura_id ON public.historico_cobranca(fatura_id);
CREATE INDEX IF NOT EXISTS idx_historico_cobranca_regra_id ON public.historico_cobranca(regra_id);
CREATE INDEX IF NOT EXISTS idx_historico_cobranca_cliente_id ON public.historico_cobranca(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_cobranca_data_envio ON public.historico_cobranca(data_envio DESC);
CREATE INDEX IF NOT EXISTS idx_historico_cobranca_fatura_regra ON public.historico_cobranca(fatura_id, regra_id) WHERE regra_id IS NOT NULL;

-- RLS
ALTER TABLE public.historico_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage historico_cobranca"
  ON public.historico_cobranca FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view historico_cobranca"
  ON public.historico_cobranca FOR SELECT
  USING (public.is_authenticated_user());
