-- Corrigir search_path das funções triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_cobranca_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Corrigir policy permissiva no cobranca_historico
DROP POLICY IF EXISTS "System can insert historico" ON public.cobranca_historico;

CREATE POLICY "Authenticated users can insert historico" ON public.cobranca_historico
  FOR INSERT WITH CHECK (public.is_authenticated_user());