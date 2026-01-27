-- Tabela de filas de cobrança (uma fila por regra)
CREATE TABLE IF NOT EXISTS public.filas_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE CASCADE,
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'falha')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
);

COMMENT ON TABLE public.filas_cobranca IS 'Filas de cobrança organizadas por regra - faturas que devem ser cobradas';
COMMENT ON COLUMN public.filas_cobranca.regra_id IS 'ID da regra que gerou esta entrada (NULL para fila crítica)';
COMMENT ON COLUMN public.filas_cobranca.status IS 'Status do envio: pendente, processando, enviado, falha';

-- Constraint única: uma fatura só pode estar uma vez na mesma regra (quando pendente)
-- Usando COALESCE para tratar NULL como string única para fila crítica
CREATE UNIQUE INDEX IF NOT EXISTS idx_filas_cobranca_regra_fatura 
  ON public.filas_cobranca(COALESCE(regra_id::text, 'CRITICA'), fatura_id) 
  WHERE status = 'pendente';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_filas_cobranca_regra_id ON public.filas_cobranca(regra_id);
CREATE INDEX IF NOT EXISTS idx_filas_cobranca_fatura_id ON public.filas_cobranca(fatura_id);
CREATE INDEX IF NOT EXISTS idx_filas_cobranca_cliente_id ON public.filas_cobranca(cliente_id);
CREATE INDEX IF NOT EXISTS idx_filas_cobranca_status ON public.filas_cobranca(status, created_at);
CREATE INDEX IF NOT EXISTS idx_filas_cobranca_pendentes ON public.filas_cobranca(regra_id, status) WHERE status = 'pendente';

-- RLS
ALTER TABLE public.filas_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage filas_cobranca"
  ON public.filas_cobranca FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view filas_cobranca"
  ON public.filas_cobranca FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_filas_cobranca_updated_at
  BEFORE UPDATE ON public.filas_cobranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
