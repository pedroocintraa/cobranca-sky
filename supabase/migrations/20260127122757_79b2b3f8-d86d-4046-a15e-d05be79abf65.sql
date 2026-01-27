-- Criar tabela regras_cobranca
CREATE TABLE public.regras_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('antes_vencimento', 'apos_vencimento')),
  dias INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela fila_cobranca_critica
CREATE TABLE public.fila_cobranca_critica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  dias_atraso INTEGER NOT NULL DEFAULT 0,
  prioridade INTEGER NOT NULL DEFAULT 0,
  processado BOOLEAN NOT NULL DEFAULT false,
  processado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.regras_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_cobranca_critica ENABLE ROW LEVEL SECURITY;

-- Criar politicas RLS para regras_cobranca
CREATE POLICY "Admin can manage regras" ON public.regras_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view regras" ON public.regras_cobranca
  FOR SELECT USING (is_authenticated_user());

-- Criar politicas RLS para fila_cobranca_critica
CREATE POLICY "Admin can manage fila" ON public.fila_cobranca_critica
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view fila" ON public.fila_cobranca_critica
  FOR SELECT USING (is_authenticated_user());

-- Trigger para updated_at
CREATE TRIGGER update_regras_cobranca_updated_at
  BEFORE UPDATE ON public.regras_cobranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fila_cobranca_critica_updated_at
  BEFORE UPDATE ON public.fila_cobranca_critica
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();