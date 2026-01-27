-- Criar enum para status da fila
CREATE TYPE status_fila_cobranca AS ENUM ('pendente', 'processando', 'enviado', 'falha');

-- Criar enum para status do historico
CREATE TYPE status_historico_cobranca AS ENUM ('enviado', 'falha');

-- Criar tabela filas_cobranca
CREATE TABLE public.filas_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE SET NULL,
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status status_fila_cobranca NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela historico_cobranca
CREATE TABLE public.historico_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fila_critica BOOLEAN NOT NULL DEFAULT false,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  status status_historico_cobranca NOT NULL DEFAULT 'enviado',
  mensagem_enviada TEXT,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.filas_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cobranca ENABLE ROW LEVEL SECURITY;

-- Politicas RLS para filas_cobranca
CREATE POLICY "Admin can manage filas" ON public.filas_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view filas" ON public.filas_cobranca
  FOR SELECT USING (is_authenticated_user());

-- Politicas RLS para historico_cobranca
CREATE POLICY "Admin can manage historico" ON public.historico_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view historico" ON public.historico_cobranca
  FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert historico" ON public.historico_cobranca
  FOR INSERT WITH CHECK (is_authenticated_user());

-- Trigger para updated_at em filas_cobranca
CREATE TRIGGER update_filas_cobranca_updated_at
  BEFORE UPDATE ON public.filas_cobranca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indices para performance
CREATE INDEX idx_filas_cobranca_regra_id ON public.filas_cobranca(regra_id);
CREATE INDEX idx_filas_cobranca_status ON public.filas_cobranca(status);
CREATE INDEX idx_filas_cobranca_fatura_id ON public.filas_cobranca(fatura_id);
CREATE INDEX idx_historico_cobranca_fatura_id ON public.historico_cobranca(fatura_id);
CREATE INDEX idx_historico_cobranca_data_envio ON public.historico_cobranca(data_envio);