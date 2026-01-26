-- Função para incrementar contador de sucesso do lote
CREATE OR REPLACE FUNCTION public.increment_lote_success(lote_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lotes_cobranca
  SET 
    total_enviados = total_enviados + 1,
    total_sucesso = total_sucesso + 1
  WHERE id = lote_id;
END;
$$;

-- Função para incrementar contador de falha do lote
CREATE OR REPLACE FUNCTION public.increment_lote_failure(lote_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lotes_cobranca
  SET 
    total_enviados = total_enviados + 1,
    total_falha = total_falha + 1
  WHERE id = lote_id;
END;
$$;