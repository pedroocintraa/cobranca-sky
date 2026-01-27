-- Tabela para fila de cobrança crítica (faturas com mais de 15 dias de atraso)
CREATE TABLE IF NOT EXISTS public.fila_cobranca_critica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  dias_atraso INTEGER NOT NULL,
  prioridade INTEGER NOT NULL DEFAULT 0,
  processado BOOLEAN NOT NULL DEFAULT false,
  processado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fila_cobranca_critica IS 'Fila especial para faturas com mais de 15 dias de atraso';
COMMENT ON COLUMN public.fila_cobranca_critica.dias_atraso IS 'Número de dias de atraso da fatura';
COMMENT ON COLUMN public.fila_cobranca_critica.prioridade IS 'Prioridade de processamento (maior número = maior prioridade)';
COMMENT ON COLUMN public.fila_cobranca_critica.processado IS 'Indica se a fatura já foi processada/notificada';

-- Constraint única para fatura_id (uma fatura só pode estar na fila uma vez)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fila_cobranca_critica_fatura_unique ON public.fila_cobranca_critica(fatura_id) WHERE processado = false;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fila_cobranca_critica_fatura_id ON public.fila_cobranca_critica(fatura_id);
CREATE INDEX IF NOT EXISTS idx_fila_cobranca_critica_cliente_id ON public.fila_cobranca_critica(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fila_cobranca_critica_processado ON public.fila_cobranca_critica(processado, prioridade DESC, dias_atraso DESC);
CREATE INDEX IF NOT EXISTS idx_fila_cobranca_critica_created_at ON public.fila_cobranca_critica(created_at);

-- RLS
ALTER TABLE public.fila_cobranca_critica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage fila_cobranca_critica"
  ON public.fila_cobranca_critica FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view fila_cobranca_critica"
  ON public.fila_cobranca_critica FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fila_cobranca_critica_updated_at
  BEFORE UPDATE ON public.fila_cobranca_critica
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
