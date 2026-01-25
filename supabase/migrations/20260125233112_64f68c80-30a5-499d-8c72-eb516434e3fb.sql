-- Create enums for lote status and envio status
CREATE TYPE public.lote_status AS ENUM (
  'rascunho', 
  'aguardando_aprovacao', 
  'aprovado', 
  'em_andamento', 
  'concluido', 
  'cancelado'
);

CREATE TYPE public.status_envio AS ENUM (
  'pendente', 
  'enviando', 
  'enviado', 
  'falha'
);

CREATE TYPE public.tipo_mensagem AS ENUM (
  'cobranca', 
  'lembrete', 
  'agradecimento'
);

-- Create lotes_cobranca table
CREATE TABLE public.lotes_cobranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  status lote_status NOT NULL DEFAULT 'rascunho',
  total_faturas INTEGER NOT NULL DEFAULT 0,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  total_sucesso INTEGER NOT NULL DEFAULT 0,
  total_falha INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create itens_lote table
CREATE TABLE public.itens_lote (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes_cobranca(id) ON DELETE CASCADE,
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  mensagem_gerada TEXT,
  status_envio status_envio NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create historico_mensagens table
CREATE TABLE public.historico_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fatura_id UUID REFERENCES public.faturas(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES public.lotes_cobranca(id) ON DELETE SET NULL,
  tipo tipo_mensagem NOT NULL DEFAULT 'cobranca',
  mensagem TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT,
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lotes_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lotes_cobranca
CREATE POLICY "Authenticated users can view lotes"
  ON public.lotes_cobranca FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert lotes"
  ON public.lotes_cobranca FOR INSERT
  WITH CHECK (is_authenticated_user());

CREATE POLICY "Admin can update lotes"
  ON public.lotes_cobranca FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete lotes"
  ON public.lotes_cobranca FOR DELETE
  USING (is_admin());

-- RLS Policies for itens_lote
CREATE POLICY "Authenticated users can view itens_lote"
  ON public.itens_lote FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert itens_lote"
  ON public.itens_lote FOR INSERT
  WITH CHECK (is_authenticated_user());

CREATE POLICY "Admin can update itens_lote"
  ON public.itens_lote FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete itens_lote"
  ON public.itens_lote FOR DELETE
  USING (is_admin());

-- RLS Policies for historico_mensagens
CREATE POLICY "Authenticated users can view historico_mensagens"
  ON public.historico_mensagens FOR SELECT
  USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert historico_mensagens"
  ON public.historico_mensagens FOR INSERT
  WITH CHECK (is_authenticated_user());

-- Triggers for updated_at
CREATE TRIGGER update_lotes_cobranca_updated_at
  BEFORE UPDATE ON public.lotes_cobranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itens_lote_updated_at
  BEFORE UPDATE ON public.itens_lote
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_lotes_cobranca_status ON public.lotes_cobranca(status);
CREATE INDEX idx_itens_lote_lote_id ON public.itens_lote(lote_id);
CREATE INDEX idx_itens_lote_status_envio ON public.itens_lote(status_envio);
CREATE INDEX idx_historico_mensagens_cliente_id ON public.historico_mensagens(cliente_id);
CREATE INDEX idx_historico_mensagens_fatura_id ON public.historico_mensagens(fatura_id);