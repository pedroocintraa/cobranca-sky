-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela de profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de status de pagamento (personalizável)
CREATE TABLE public.status_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.status_pagamento ENABLE ROW LEVEL SECURITY;

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Tabela de cobranças
CREATE TABLE public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  numero_proposta TEXT,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_instalacao DATE,
  data_vencimento DATE NOT NULL,
  status_id UUID REFERENCES public.status_pagamento(id),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

-- Tabela de histórico de alterações
CREATE TABLE public.cobranca_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID REFERENCES public.cobrancas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cobranca_historico ENABLE ROW LEVEL SECURITY;

-- Tabela de logs de importação
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nome_arquivo TEXT NOT NULL,
  registros_importados INTEGER NOT NULL DEFAULT 0,
  registros_atualizados INTEGER NOT NULL DEFAULT 0,
  registros_erro INTEGER NOT NULL DEFAULT 0,
  detalhes_erro JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Função helper: verifica se usuário tem role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função helper: verifica se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Função helper: verifica se é operator
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'operator')
$$;

-- Função helper: verifica se é admin ou operator
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_operator()
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_status_pagamento_updated_at
  BEFORE UPDATE ON public.status_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar histórico de alterações
CREATE OR REPLACE FUNCTION public.log_cobranca_changes()
RETURNS TRIGGER AS $$
DECLARE
  field_name TEXT;
  old_value TEXT;
  new_value TEXT;
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO public.cobranca_historico (cobranca_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, auth.uid(), 'status_id', OLD.status_id::TEXT, NEW.status_id::TEXT);
  END IF;
  
  IF OLD.valor IS DISTINCT FROM NEW.valor THEN
    INSERT INTO public.cobranca_historico (cobranca_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, auth.uid(), 'valor', OLD.valor::TEXT, NEW.valor::TEXT);
  END IF;
  
  IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
    INSERT INTO public.cobranca_historico (cobranca_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, auth.uid(), 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT);
  END IF;
  
  IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
    INSERT INTO public.cobranca_historico (cobranca_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, auth.uid(), 'observacoes', OLD.observacoes, NEW.observacoes);
  END IF;
  
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_cobranca_changes_trigger
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.log_cobranca_changes();

-- Trigger para criar profile ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: Admin pode tudo, usuários podem ver próprio role
CREATE POLICY "Admin can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- profiles: usuários podem ver e editar próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- status_pagamento: todos autenticados podem ver, admin pode editar
CREATE POLICY "Authenticated users can view status" ON public.status_pagamento
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Admin can manage status" ON public.status_pagamento
  FOR ALL USING (public.is_admin());

-- clientes: todos autenticados podem CRUD
CREATE POLICY "Authenticated users can view clientes" ON public.clientes
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert clientes" ON public.clientes
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update clientes" ON public.clientes
  FOR UPDATE USING (public.is_authenticated_user());

CREATE POLICY "Admin can delete clientes" ON public.clientes
  FOR DELETE USING (public.is_admin());

-- cobrancas: todos autenticados podem CRUD
CREATE POLICY "Authenticated users can view cobrancas" ON public.cobrancas
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert cobrancas" ON public.cobrancas
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update cobrancas" ON public.cobrancas
  FOR UPDATE USING (public.is_authenticated_user());

CREATE POLICY "Admin can delete cobrancas" ON public.cobrancas
  FOR DELETE USING (public.is_admin());

-- cobranca_historico: todos autenticados podem ver
CREATE POLICY "Authenticated users can view historico" ON public.cobranca_historico
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "System can insert historico" ON public.cobranca_historico
  FOR INSERT WITH CHECK (true);

-- import_logs: todos autenticados podem ver e inserir
CREATE POLICY "Authenticated users can view import_logs" ON public.import_logs
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert import_logs" ON public.import_logs
  FOR INSERT WITH CHECK (public.is_authenticated_user());

-- Inserir status padrão
INSERT INTO public.status_pagamento (nome, cor, ordem) VALUES
  ('Pendente', '#f59e0b', 1),
  ('Pago', '#22c55e', 2),
  ('Atrasado', '#ef4444', 3),
  ('Cancelado', '#6b7280', 4);