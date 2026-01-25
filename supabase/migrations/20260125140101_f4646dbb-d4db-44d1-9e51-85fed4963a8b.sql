-- 1. Criar tabela de faturas
CREATE TABLE public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID NOT NULL REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL,
  data_vencimento DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  status_id UUID REFERENCES public.status_pagamento(id),
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cobranca_id, mes_referencia)
);

-- 2. Habilitar RLS
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS
CREATE POLICY "Authenticated users can view faturas"
ON public.faturas FOR SELECT
USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert faturas"
ON public.faturas FOR INSERT
WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can update faturas"
ON public.faturas FOR UPDATE
USING (is_authenticated_user());

CREATE POLICY "Admin can delete faturas"
ON public.faturas FOR DELETE
USING (is_admin());

-- 4. Criar trigger para updated_at
CREATE TRIGGER update_faturas_updated_at
BEFORE UPDATE ON public.faturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Migrar dados: inserir faturas a partir das cobranças existentes
INSERT INTO public.faturas (cobranca_id, mes_referencia, data_vencimento, valor, status_id, observacoes, created_at)
SELECT 
  id as cobranca_id,
  COALESCE(mes_referencia, TO_CHAR(data_vencimento, 'YYYY-MM')) as mes_referencia,
  data_vencimento,
  valor,
  status_id,
  observacoes,
  created_at
FROM public.cobrancas;

-- 6. Consolidar cobranças duplicadas (manter apenas uma por cliente+proposta)
-- Primeiro, identificamos a cobrança mais antiga por cliente/proposta para manter
WITH cobrancas_principais AS (
  SELECT DISTINCT ON (cliente_id, numero_proposta)
    id,
    cliente_id,
    numero_proposta,
    MIN(data_vencimento) OVER (PARTITION BY cliente_id, numero_proposta) as primeira_data
  FROM public.cobrancas
  ORDER BY cliente_id, numero_proposta, data_vencimento ASC
),
-- Remapear faturas das cobranças duplicadas para a principal
faturas_remapeadas AS (
  SELECT 
    f.id as fatura_id,
    cp.id as nova_cobranca_id
  FROM public.faturas f
  JOIN public.cobrancas c ON f.cobranca_id = c.id
  JOIN cobrancas_principais cp ON c.cliente_id = cp.cliente_id 
    AND COALESCE(c.numero_proposta, '') = COALESCE(cp.numero_proposta, '')
  WHERE f.cobranca_id != cp.id
)
UPDATE public.faturas f
SET cobranca_id = fr.nova_cobranca_id
FROM faturas_remapeadas fr
WHERE f.id = fr.fatura_id;

-- 7. Remover cobranças duplicadas (manter apenas a principal)
DELETE FROM public.cobrancas c
WHERE NOT EXISTS (
  SELECT 1 FROM (
    SELECT DISTINCT ON (cliente_id, numero_proposta) id
    FROM public.cobrancas
    ORDER BY cliente_id, numero_proposta, data_vencimento ASC
  ) principais
  WHERE principais.id = c.id
);

-- 8. Remover faturas duplicadas que possam ter surgido (mesmo mês para mesma cobrança)
DELETE FROM public.faturas f1
WHERE EXISTS (
  SELECT 1 FROM public.faturas f2
  WHERE f2.cobranca_id = f1.cobranca_id
    AND f2.mes_referencia = f1.mes_referencia
    AND f2.id < f1.id
);