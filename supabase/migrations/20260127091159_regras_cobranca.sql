-- Tabela de regras de cobrança configuráveis
CREATE TABLE IF NOT EXISTS public.regras_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('antes_vencimento', 'apos_vencimento')),
  dias INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

COMMENT ON TABLE public.regras_cobranca IS 'Regras configuráveis para cobrança automática baseadas em dias antes/depois do vencimento';
COMMENT ON COLUMN public.regras_cobranca.tipo IS 'Tipo da regra: antes_vencimento (dias negativo) ou apos_vencimento (dias positivo)';
COMMENT ON COLUMN public.regras_cobranca.dias IS 'Número de dias: negativo para antes do vencimento, positivo para depois';
COMMENT ON COLUMN public.regras_cobranca.ordem IS 'Ordem de prioridade (menor número = maior prioridade)';

-- RLS
ALTER TABLE public.regras_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage regras_cobranca"
  ON public.regras_cobranca FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view regras_cobranca"
  ON public.regras_cobranca FOR SELECT
  USING (public.is_authenticated_user());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_regras_cobranca_updated_at
  BEFORE UPDATE ON public.regras_cobranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir regras padrão
INSERT INTO public.regras_cobranca (tipo, dias, ativo, ordem) VALUES
  ('antes_vencimento', -3, true, 1),
  ('apos_vencimento', 0, true, 2),
  ('apos_vencimento', 3, true, 3),
  ('apos_vencimento', 5, true, 4),
  ('apos_vencimento', 10, true, 5),
  ('apos_vencimento', 15, true, 6)
ON CONFLICT DO NOTHING;
